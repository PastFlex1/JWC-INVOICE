
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('Resend API key is not configured.');
    }

    const body = await request.json();
    const { to, subject, body: emailBody, attachments: pdfAttachments } = body;

    if (!to || !subject || !emailBody || !pdfAttachments) {
      return NextResponse.json({ message: 'Missing required fields in request.' }, { status: 400 });
    }

    const toEmails = to.split(',').map((email: string) => email.trim()).filter(Boolean);

    if (toEmails.length === 0) {
      return NextResponse.json({ message: 'At least one recipient email is required.' }, { status: 400 });
    }

    const automatedReplyNotice = `
      <br><br>
      <div style="font-family: Arial, sans-serif; font-size: 11px; color: #888; margin-top: 20px;">
        <p>Please don't answer to this email, because is automatically, if you need assistance, please contact to <a href="mailto:jcwf@outlook.es">jcwf@outlook.es</a></p>
      </div>
    `;

    const signatureHtml = `
      <div style="font-family: Arial, sans-serif; font-size: 12px; color: #555; margin-top: 15px;">
        <p style="margin: 0;">Best Regards</p>
        <p style="margin: 0;">Team: JCW FLOWERS</p>
        <p style="margin: 0;">Teams: Alexa JCW FLOWERS</p>
        <p style="margin: 0;">Email: jcwf@outlook.es</p>
      </div>
      <div style="text-align: center; margin-top: 20px;">
        <img src="https://firebasestorage.googleapis.com/v0/b/jcw-flowers.appspot.com/o/logo.png?alt=media&token=bf63943a-1438-4171-a0e2-892c81358b85" alt="JCW Flowers Logo" width="200" />
      </div>
    `;

    const emailHtml = `<div style="font-family: Arial, sans-serif; font-size: 14px;">${emailBody.replace(/\n/g, '<br>')}</div>${automatedReplyNotice}${signatureHtml}`;

    await resend.emails.send({
      from: 'JWC FLOWERS <facturacion@puntodeventastore.store>',
      to: toEmails,
      subject: subject,
      html: emailHtml,
      attachments: pdfAttachments,
    });

    return NextResponse.json({ message: 'Email sent successfully!' }, { status: 200 });

  } catch (error) {
    console.error('Failed to send invoice:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ message: `Failed to process and send email: ${errorMessage}` }, { status: 500 });
  }
}
