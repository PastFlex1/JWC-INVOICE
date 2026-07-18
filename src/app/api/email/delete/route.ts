import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import { getEmailById, deleteEmail } from '@/services/emails';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing email ID' }, { status: 400 });
    }

    const email = await getEmailById(id);
    if (!email) {
      return NextResponse.json({ error: 'Email not found in database' }, { status: 404 });
    }

    // Connect to IMAP to mark as deleted
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
             await client.messageDelete(email.uid.toString(), { uid: true });
          }
        } finally {
          lock.release();
        }
      } catch (imapErr) {
        console.error('Error deleting from IMAP:', imapErr);
        // We continue to delete from Firebase even if IMAP fails
      } finally {
        await client.logout();
      }
    }

    // Delete from Firestore
    await deleteEmail(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete email error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
