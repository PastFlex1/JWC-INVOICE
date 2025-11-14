
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
    
    const emailHtml = `
      <html>
        <body>
          <p>${emailBody.replace(/\n/g, '<br>')}</p>
          <br>
          <p>Please don't answer to this email, because is automatically, if you need assistance, please contact to <a href="mailto:jcwf@outlook.es">jcwf@outlook.es</a></p>
          <br>
          <p>Best Regards</p>
          <p>Team: JCW FLOWERS</p>
          <p>Teams: Alexa JCW FLOWERS</p>
          <p>Email: jcwf@outlook.es</p>
          <img src="cid:jcw-logo-id" alt="JCW Flowers Logo" width="200" />
        </body>
      </html>
    `;

    const attachments = pdfAttachments || [];
    
    // Add the logo as an embedded attachment with a Content-ID
    attachments.push({
      filename: 'logo.png',
      content: logoBase64,
      contentId: 'jcw-logo-id',
    });

    await resend.emails.send({
      from: 'JWC FLOWERS <facturacion@puntodeventastore.store>',
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
