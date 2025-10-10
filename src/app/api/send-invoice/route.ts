
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('Resend API key is not configured.');
    }

    const body = await request.json();
    const { to, subject, body: emailBody, attachments } = body;

    if (!to || !subject || !emailBody || !attachments) {
      return NextResponse.json({ message: 'Missing required fields in request.' }, { status: 400 });
    }

    const toEmails = to.split(',').map((email: string) => email.trim()).filter(Boolean);

    if (toEmails.length === 0) {
      return NextResponse.json({ message: 'At least one recipient email is required.' }, { status: 400 });
    }
    
    const signatureHtml = `
      <br><br>
      <hr>
      <p style="font-size: 12px; color: #555;">
        <strong>JCW FLOWERS</strong><br>
        <em>Para Floristas</em><br>
        jcwf@outlook.es<br>
        +593 096 744 1343<br>
        Pasaje F y Calle Quito, EL QUINCHE - QUITO - ECUADOR
      </p>
    `;

    const emailHtml = `<p>${emailBody.replace(/\n/g, '<br>')}</p>${signatureHtml}`;

    await resend.emails.send({
      from: 'JCW Flowers <facturacion@puntodeventastore.store>',
      to: toEmails,
      subject: subject,
      html: emailHtml,
      attachments: attachments,
    });

    return NextResponse.json({ message: 'Email sent successfully!' }, { status: 200 });

  } catch (error) {
    console.error('Failed to send invoice:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ message: `Failed to process and send email: ${errorMessage}` }, { status: 500 });
  }
}
