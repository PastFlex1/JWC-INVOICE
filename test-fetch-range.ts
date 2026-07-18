import { ImapFlow } from 'imapflow';
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
    logger: true // Enable logger to see IMAP commands
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const status = await client.status('INBOX', { uidNext: true });
      console.log('uidNext:', status.uidNext);
      
      const fetchRange = `${status.uidNext}:*`;
      console.log('Fetching range:', fetchRange);
      
      for await (let message of client.fetch(fetchRange, { uid: true })) {
         console.log(message.uid);
      }
      console.log('Fetch completed without error.');
    } finally {
      lock.release();
    }
  } catch (err) {
    console.error('Caught Error:', err);
  } finally {
    await client.logout();
  }
}

run();
