
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';

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
    
    // Path to the logo file in the public directory
    const logoPath = path.join(process.cwd(), 'public', 'logo.png');
    const logoBuffer = fs.readFileSync(logoPath);
    const logoBase64 = logoBuffer.toString('base64');

    const signatureHtml = `
      <br><br>
      <hr>
      <div style="font-family: Arial, sans-serif; font-size: 12px; color: #555; margin-top: 15px;">
        <img src="cid:logo" alt="JCW Flowers Logo" width="150" style="margin-bottom: 10px;" />
        <p style="margin: 0;"><strong>jwcf</strong></p>
        <p style="margin: 0;"><em>Para Floristas</em></p>
        <p style="margin: 0;">jcwf@outlook.es</p>
        <p style="margin: 0;">+593 096 744 1343</p>
        <p style="margin: 0;">Pasaje F y Calle Quito, EL QUINCHE - QUITO - ECUADOR</p>
      </div>
    `;

    const emailHtml = `<div style="font-family: Arial, sans-serif; font-size: 14px;">${emailBody.replace(/\n/g, '<br>')}</div>${signatureHtml}`;

    const allAttachments = [
        ...pdfAttachments,
        {
            filename: 'logo.png',
            content: logoBase64,
            cid: 'logo',
        }
    ];

    await resend.emails.send({
      from: 'jwcf <facturacion@puntodeventastore.store>',
      to: toEmails,
      subject: subject,
      html: emailHtml,
      attachments: allAttachments,
    });

    return NextResponse.json({ message: 'Email sent successfully!' }, { status: 200 });

  } catch (error) {
    console.error('Failed to send invoice:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ message: `Failed to process and send email: ${errorMessage}` }, { status: 500 });
  }
}
