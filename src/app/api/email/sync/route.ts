import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { addEmail, getLastSyncUid, updateLastSyncUid, getEmails } from '@/services/emails';
import type { EmailMessage } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Next.js allows up to 60s max execution for standard plans

export async function POST(req: Request) {
  if (!process.env.MAIL_PASSWORD) {
    return NextResponse.json({ error: 'MAIL_PASSWORD configuration missing' }, { status: 500 });
  }

  const client = new ImapFlow({
    host: process.env.IMAP_HOST || 'mail.privateemail.com',
    port: parseInt(process.env.IMAP_PORT || '993', 10),
    secure: process.env.IMAP_SECURE !== 'false',
    auth: {
      user: process.env.IMAP_USER || 'sales@jcwflowers.com',
      pass: process.env.MAIL_PASSWORD
    },
    logger: false
  });

  try {
    await client.connect();
    
    // Find Sent folder
    const mailboxes = await client.list();
    const sentMailbox = mailboxes.find(mb => mb.specialUse === '\\Sent' || mb.path.toLowerCase().includes('sent'));
    const sentFolderName = sentMailbox ? sentMailbox.path : null;

    const foldersToSync = ['INBOX'];
    if (sentFolderName) foldersToSync.push(sentFolderName);

    // Get current emails to avoid duplicates based on messageId (since IMAP Append creates a new UID)
    // Actually, to be safe, it's better to fetch and check if messageId already exists.
    // For performance in this snippet, we'll fetch all current emails' messageIds once.
    const allEmails = await getEmails();
    const existingMessageIds = new Set(allEmails.map(e => e.messageId).filter(Boolean));

    let totalNewEmails = 0;

    for (const folder of foldersToSync) {
      let lock;
      try {
        lock = await client.getMailboxLock(folder);
      } catch (e) {
        console.warn(`Could not lock folder ${folder}:`, e);
        continue;
      }
      
      try {
        const lastUid = await getLastSyncUid(folder);
        const fetchRange = `${lastUid + 1}:*`;
        
        let highestUid = lastUid;
        let folderNewEmails = 0;

        const status = await client.status(folder, { uidNext: true });
        if (!status.uidNext || status.uidNext <= lastUid + 1) {
           console.log(`[SYNC] No new messages in ${folder}. uidNext: ${status.uidNext}, lastUid: ${lastUid}`);
           continue;
        }

        for await (let message of client.fetch(fetchRange, { source: true, uid: true }, { uid: true })) {
          console.log(`[SYNC] Found message UID: ${message.uid}`);
          if (message.uid <= lastUid) {
            console.log(`[SYNC] Skipping UID ${message.uid} because it is <= lastUid (${lastUid})`);
            continue; 
          }
          
          if (message.uid > highestUid) {
            highestUid = message.uid;
          }

          const parsed = (await simpleParser(message.source as any)) as any;
          
          console.log(`[SYNC] Processing UID ${message.uid}, Message-ID: ${parsed.messageId}, Subject: ${parsed.subject}`);

          // Prevent duplicates (especially for Sent emails appended by our send/route.ts)
          if (parsed.messageId && existingMessageIds.has(parsed.messageId)) {
             console.log(`[SYNC] Skipping UID ${message.uid} because messageId ${parsed.messageId} already exists in DB`);
             continue;
          }

          const isSentFolder = folder === sentFolderName;
          
          const attachments = parsed.attachments ? parsed.attachments.map((att: any) => ({
             filename: att.filename,
             contentType: att.contentType,
             size: att.size,
             // Storing base64 inline is not ideal for large files, but is used here as a fallback
             // if Firebase Storage isn't explicitly requested/setup by user.
             data: att.content ? `data:${att.contentType};base64,${att.content.toString('base64')}` : undefined
          })) : [];

          const emailData: Omit<EmailMessage, 'id'> = {
            messageId: parsed.messageId || '',
            uid: message.uid,
            type: isSentFolder ? 'sent' : 'inbox',
            from: parsed.from?.value[0]?.address || 'Unknown',
            to: parsed.to ? (Array.isArray(parsed.to) ? parsed.to.flatMap((t: any) => t.value.map((v: any) => v.address!)) : parsed.to.value.map((v: any) => v.address!)) : [],
            cc: parsed.cc ? (Array.isArray(parsed.cc) ? parsed.cc.flatMap((t: any) => t.value.map((v: any) => v.address!)) : parsed.cc.value.map((v: any) => v.address!)) : [],
            subject: parsed.subject || '(Sin asunto)',
            text: parsed.text || '',
            html: parsed.html || parsed.textAsHtml || '',
            date: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
            isRead: isSentFolder ? true : false, // Sent emails are considered read
            status: 'delivered',
            attachments,
            createdAt: new Date().toISOString()
          };

          await addEmail(emailData);
          if (parsed.messageId) {
             existingMessageIds.add(parsed.messageId);
          }
          folderNewEmails++;
          totalNewEmails++;
        }

        if (highestUid > lastUid) {
          await updateLastSyncUid(folder, highestUid);
        }
      } finally {
        lock.release();
      }
    }

    return NextResponse.json({ success: true, count: totalNewEmails });
  } catch (error: any) {
    console.error('IMAP sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await client.logout();
  }
}
