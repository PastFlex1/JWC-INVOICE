
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
    const { to, bcc, subject, body: emailBody, attachments: pdfAttachments } = body;

    if (!to || !subject || !emailBody) {
      return NextResponse.json({ message: 'Missing required fields in request.' }, { status: 400 });
    }

    const toEmails = to.split(',').map((email: string) => email.trim()).filter(Boolean);
    const bccEmails = bcc ? bcc.split(',').map((email: string) => email.trim()).filter(Boolean) : [];


    if (toEmails.length === 0) {
      return NextResponse.json({ message: 'At least one recipient email is required.' }, { status: 400 });
    }

    // Read logo file and convert to Base64 string
    const logoPath = path.join(process.cwd(), 'public', 'logo.png');
    const logoBase64 = fs.readFileSync(logoPath).toString('base64');
    const logoDataUri = `data:image/png;base64,${logoBase64}`;
    
    const emailHtml = `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <p>${emailBody.replace(/\n/g, '<br>')}</p>
          <br>
          <p>Please don't answer to this email, because is automatically, if you need assistance, please contact to <a href="mailto:jcwf@outlook.es">jcwf@outlook.es</a></p>
          <br>
          <img src="${logoDataUri}" alt="JCW Flowers Logo" width="200" />
          <br>
          <br>
          <hr style="border: 0; border-top: 1px solid #eee;" />
          <p style="font-size: 10px; color: #888;">
            Desarrollado por <strong>Palma Nexus Solutions - 099 821 2307</strong>
          </p>
        </body>
      </html>
    `;

    const attachments = pdfAttachments || [];

    await resend.emails.send({
      from: 'JCW FLOWERS <facturacion@puntodeventastore.store>',
      to: toEmails,
      bcc: bccEmails.length > 0 ? bccEmails : undefined,
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
