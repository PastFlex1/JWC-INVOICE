import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  const client = new ImapFlow({
    host: process.env.IMAP_HOST || 'mail.privateemail.com',
    port: parseInt(process.env.IMAP_PORT || '993', 10),
    secure: process.env.IMAP_SECURE !== 'false',
    auth: {
      user: process.env.IMAP_USER || 'sales@jcwflowers.com',
      pass: process.env.MAIL_PASSWORD || ''
    },
    logger: true // Enable logger to see commands
  });

  try {
    await client.connect();
    console.log('Connected');
    
    const mailboxes = await client.list();
    const sentMailbox = mailboxes.find(mb => mb.specialUse === '\\Sent' || mb.path.toLowerCase().includes('sent'));
    const sentFolderName = sentMailbox ? sentMailbox.path : null;
    console.log('Sent folder:', sentFolderName);

    const foldersToSync = ['INBOX'];
    if (sentFolderName) foldersToSync.push(sentFolderName);

    for (const folder of foldersToSync) {
      console.log('Syncing folder:', folder);
      let lock = await client.getMailboxLock(folder);
      try {
        const lastUid = folder === 'INBOX' ? 4 : 2; // Hardcoding known lastUids for testing
        const fetchRange = `${lastUid + 1}:*`;
        console.log(`fetchRange: ${fetchRange}`);

        const status = await client.status(folder, { uidNext: true });
        console.log(`status uidNext: ${status.uidNext}`);
        if (!status.uidNext || status.uidNext <= lastUid + 1) {
           console.log(`No new messages in ${folder}`);
           continue;
        }

        for await (let message of client.fetch(fetchRange, { source: true, uid: true }, { uid: true })) {
           console.log('Got message UID:', message.uid);
        }
      } finally {
        lock.release();
      }
    }
  } catch (err) {
    console.error('CRASH:', err);
  } finally {
    await client.logout();
  }
}
run();
