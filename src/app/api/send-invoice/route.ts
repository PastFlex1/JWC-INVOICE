
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

    const emailHtml = `<div style="font-family: Arial, sans-serif; font-size: 14px;">${emailBody.replace(/\n/g, '<br>')}</div>`;

    await resend.emails.send({
      from: 'facturacion@puntodeventastore.store',
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
