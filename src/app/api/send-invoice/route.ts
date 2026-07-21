import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { addEmail } from '@/services/emails';
import type { EmailMessage } from '@/lib/types';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; 

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, bcc, subject, body: emailBody, attachments: pdfAttachments } = body;

    if (!to || !subject || !emailBody) {
      return NextResponse.json({ message: 'Missing required fields in request.' }, { status: 400 });
    }

    const toEmails = to.split(',').map((email: string) => email.trim()).filter(Boolean);
    const bccEmails = bcc ? bcc.split(',').map((email: string) => email.trim()).filter(Boolean) : [];

    if (toEmails.length === 0) {
      return NextResponse.json({ message: 'At least one recipient email is required.' }, { status: 400 });
    }

    const toString = toEmails.join(', ');
    const bccString = bccEmails.join(', ');

    const fromAddress = process.env.MAIL_FROM_ADDRESS || 'sales@jcwflowers.com';
    const fromName = process.env.MAIL_FROM_NAME || 'JCW Flowers';
    const replyTo = process.env.MAIL_REPLY_TO || 'sales@jcwflowers.com';
    const mailPassword = process.env.MAIL_PASSWORD;
    const smtpHost = process.env.SMTP_HOST || 'mail.privateemail.com';
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 465;

    if (!mailPassword) {
      return NextResponse.json({ error: 'MAIL_PASSWORD missing in environment' }, { status: 500 });
    }

    // Read logo file and convert to Buffer
    const logoPath = path.join(process.cwd(), 'public', 'logo.png');
    const logoBuffer = fs.readFileSync(logoPath);
    
    const emailHtml = `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <p>${emailBody.replace(/\n/g, '<br>')}</p>
          <br>
          <p>Please don't answer to this email, because is automatically, if you need assistance, please contact to <a href="mailto:sales@jcwflowers.com">sales@jcwflowers.com</a></p>
          <br>
          <img src="cid:logo" alt="JCW Flowers Logo" width="200" />
          <br>
          <br>
          <hr style="border: 0; border-top: 1px solid #eee;" />
          <p style="font-size: 10px; color: #888;">
            Desarrollado por <strong>Palma Nexus Solutions - 099 821 2307</strong>
          </p>
        </body>
      </html>
    `;

    const attachments: any[] = (pdfAttachments || []).map((att: any) => {
      if (typeof att.content === 'string' && !att.content.startsWith('data:')) {
        return {
          ...att,
          encoding: 'base64'
        };
      }
      return att;
    });

    attachments.push({
      filename: 'logo.png',
      content: logoBuffer,
      cid: 'logo' // nodemailer uses 'cid' instead of 'content_id'
    });

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: process.env.IMAP_USER || fromAddress,
        pass: mailPassword,
      },
    });
    
    const mailOptions: any = {
      from: `"${fromName}" <${fromAddress}>`,
      to: toString,
      bcc: bccString,
      subject: subject,
      html: emailHtml,
      replyTo,
      attachments: attachments
    };

    const info = await transporter.sendMail(mailOptions);
    const messageIdStr = info.messageId;

    // IMAP Append to Sent folder
    const imapClient = new ImapFlow({
      host: process.env.IMAP_HOST || 'mail.privateemail.com',
      port: parseInt(process.env.IMAP_PORT || '993', 10),
      secure: process.env.IMAP_SECURE !== 'false',
      auth: {
        user: process.env.IMAP_USER || fromAddress,
        pass: mailPassword
      },
      logger: false
    });

    try {
      await imapClient.connect();
      const MailComposer = require('nodemailer/lib/mail-composer');
      const mail = new MailComposer(mailOptions);
      const rawMessage = await mail.compile().build();
      
      let sentFolder = 'Sent Items'; 
      const mailboxes = await imapClient.list();
      const sentMailbox = mailboxes.find(mb => mb.specialUse === '\\Sent' || mb.path.toLowerCase().includes('sent'));
      if (sentMailbox) {
         sentFolder = sentMailbox.path;
      }
      await imapClient.append(sentFolder, rawMessage, ['\\Seen']);
    } catch (imapErr) {
      console.error('Error appending to IMAP Sent folder:', imapErr);
    } finally {
      await imapClient.logout();
    }

    // Prepare attachments for Firestore (base64 string without logo binary)
    const firestoreAttachments = [];
    if (pdfAttachments && pdfAttachments.length > 0) {
      for (const att of pdfAttachments) {
        if (att.cid === 'logo') continue;
        let dataStr = att.content;
        if (Buffer.isBuffer(att.content)) {
          dataStr = `data:application/pdf;base64,${att.content.toString('base64')}`;
        } else if (typeof att.content === 'string' && !att.content.startsWith('data:')) {
          dataStr = `data:application/pdf;base64,${att.content}`;
        }
        firestoreAttachments.push({
          filename: att.filename,
          contentType: 'application/pdf',
          size: Buffer.isBuffer(att.content) ? att.content.length : Math.round(att.content.length * 0.75),
          data: dataStr
        });
      }
    }

    const emailData: Omit<EmailMessage, 'id'> = {
      messageId: messageIdStr,
      type: 'sent',
      from: fromAddress,
      to: toEmails,
      bcc: bccEmails,
      subject,
      text: emailBody, // fallback to the plain body
      html: emailHtml,
      date: new Date().toISOString(),
      isRead: true, 
      status: 'delivered', 
      createdBy: 'admin',
      createdAt: new Date().toISOString()
    };
    
    if (firestoreAttachments.length > 0) {
       (emailData as any).attachments = firestoreAttachments;
    }

    const docId = await addEmail(emailData);

    return NextResponse.json({ message: 'Email sent successfully!', docId, messageId: messageIdStr }, { status: 200 });

  } catch (error) {
    console.error('Failed to send invoice:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ message: `Failed to process and send email: ${errorMessage}` }, { status: 500 });
  }
}
