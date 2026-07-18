import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import { markEmailAsRead, getEmailById } from '@/services/emails';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { id, isRead } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing email ID' }, { status: 400 });
    }

    const email = await getEmailById(id);
    if (!email) {
      return NextResponse.json({ error: 'Email not found in database' }, { status: 404 });
    }

    // Connect to IMAP to update flag
    if (process.env.MAIL_PASSWORD) {
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
        
        let folder = 'INBOX';
        if (email.type === 'sent') {
           const mailboxes = await client.list();
           const sentMailbox = mailboxes.find(mb => mb.specialUse === '\\Sent' || mb.path.toLowerCase().includes('sent'));
           if (sentMailbox) folder = sentMailbox.path;
        }

        let lock = await client.getMailboxLock(folder);
        try {
          if (email.uid !== undefined) {
            if (isRead) {
              await client.messageFlagsAdd(email.uid.toString(), ['\\Seen'], { uid: true });
            } else {
              await client.messageFlagsRemove(email.uid.toString(), ['\\Seen'], { uid: true });
            }
          }
        } finally {
          lock.release();
        }
      } catch (imapErr) {
        console.error('Error updating IMAP flag:', imapErr);
        // Continue to update Firestore even if IMAP fails
      } finally {
        await client.logout();
      }
    }

    // Update Firestore
    // Note: We need a new service function if we want to toggle to unread, 
    // but the existing `markEmailAsRead` sets it to true. Let's rewrite it here temporarily or import db.
    const { db } = await import('@/lib/firebase');
    const { doc, updateDoc } = await import('firebase/firestore');
    await updateDoc(doc(db, 'emails', id), { isRead });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Mark read error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
