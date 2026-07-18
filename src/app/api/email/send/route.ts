import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { addEmail } from '@/services/emails';
import type { EmailMessage } from '@/lib/types';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; 

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to, cc, bcc, subject, text, html, createdBy, threadId, inReplyTo, isAutomatic, attachments } = body;

    if (!to || !subject) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const fromAddress = process.env.MAIL_FROM_ADDRESS || 'sales@jcwflowers.com';
    const fromName = process.env.MAIL_FROM_NAME || 'JCW Flowers';
    const replyTo = process.env.MAIL_REPLY_TO || 'sales@jcwflowers.com';
    const mailPassword = process.env.MAIL_PASSWORD;
    const smtpHost = process.env.SMTP_HOST || 'mail.privateemail.com';
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 465;

    let messageIdStr = '';
    
    const mailAttachments = attachments ? attachments.map((att: any) => ({
      filename: att.name,
      content: att.data.includes('base64,') ? att.data.split('base64,')[1] : att.data,
      encoding: 'base64',
      contentType: att.type
    })) : [];

    if (isAutomatic && resend) {
      const { data, error } = await resend.emails.send({
        from: `${fromName} <${fromAddress}>`,
        to,
        cc,
        bcc,
        subject,
        text,
        html,
        reply_to: replyTo,
        attachments: mailAttachments.map((a: any) => ({ filename: a.filename, content: a.content }))
      });

      if (error) {
        console.error('Resend error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      messageIdStr = data?.id || '';
    } else {
      if (!mailPassword) {
        return NextResponse.json({ error: 'MAIL_PASSWORD missing in environment' }, { status: 500 });
      }

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
        to,
        cc,
        bcc,
        subject,
        text,
        html,
        replyTo,
        attachments: mailAttachments
      };

      if (inReplyTo) {
         mailOptions.inReplyTo = inReplyTo;
         mailOptions.references = [inReplyTo];
      }

      const info = await transporter.sendMail(mailOptions);
      messageIdStr = info.messageId;

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
        
        // Use require inside for nodemailer deep import
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
    }

    const emailData: Omit<EmailMessage, 'id'> = {
      messageId: messageIdStr,
      type: 'sent',
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      cc: cc ? (Array.isArray(cc) ? cc : [cc]) : [],
      bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : [],
      subject,
      text,
      html,
      date: new Date().toISOString(),
      isRead: true, 
      status: 'delivered', 
      ...(threadId && { threadId }),
      createdBy,
      createdAt: new Date().toISOString()
    };
    
    if (attachments && attachments.length > 0) {
       (emailData as any).attachments = attachments.map((a: any) => ({
           filename: a.name,
           contentType: a.type,
           size: a.size,
           data: a.data 
       }));
    }

    const docId = await addEmail(emailData);

    return NextResponse.json({ success: true, docId, messageId: messageIdStr });
  } catch (error: any) {
    console.error('Email send error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
