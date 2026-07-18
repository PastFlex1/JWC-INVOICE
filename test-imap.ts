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
    logger: false
  });

  try {
    await client.connect();
    console.log('Connected to IMAP');
    
    const lock = await client.getMailboxLock('INBOX');
    try {
      console.log('Locked INBOX');
      const status = await client.status('INBOX', { messages: true });
      console.log('INBOX messages:', status.messages);
      
      if (status.messages > 0) {
        // Fetch last 5 messages
        const start = Math.max(1, status.messages - 4);
        const range = `${start}:*`;
        
        for await (let message of client.fetch(range, { source: true, uid: true })) {
          const parsed = await simpleParser(message.source);
          console.log(`UID: ${message.uid}`);
          console.log(`Subject: ${parsed.subject}`);
          console.log(`From: ${parsed.from?.text}`);
          console.log(`To: ${parsed.to?.text}`);
          console.log(`Message-ID: ${parsed.messageId}`);
          console.log(`In-Reply-To: ${parsed.inReplyTo}`);
          console.log('---');
        }
      }
    } finally {
      lock.release();
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.logout();
  }
}

run();
