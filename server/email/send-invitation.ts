/**
 * Send Invitation Email for Legacy Customer Onboarding
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendInvitationEmailParams {
  email: string;
  firstName: string;
  lastName: string;
  invitationToken: string;
  expiresAt: Date;
}

export async function sendInvitationEmail(params: SendInvitationEmailParams) {
  const {
    email,
    firstName,
    lastName,
    invitationToken,
    expiresAt,
  } = params;

  // Build registration URL
  const registrationUrl = `${process.env.VITE_FRONTEND_URL || 'https://angelus.manus.space'}/register?invitation=${invitationToken}`;

  // Format expiration date
  const expirationDate = new Date(expiresAt).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const htmlContent = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #333;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      .header {
        background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
        color: #ffd700;
        padding: 30px;
        text-align: center;
        border-radius: 8px 8px 0 0;
      }
      .header h1 {
        margin: 0;
        font-size: 28px;
      }
      .content {
        background: #f9f9f9;
        padding: 30px;
        border-radius: 0 0 8px 8px;
      }
      .greeting {
        font-size: 16px;
        margin-bottom: 20px;
      }
      .button {
        display: inline-block;
        background: #ffd700;
        color: #1a1a1a;
        padding: 12px 30px;
        text-decoration: none;
        border-radius: 4px;
        font-weight: bold;
        margin: 20px 0;
      }
      .button:hover {
        background: #ffed4e;
      }
      .info-box {
        background: #fff;
        border-left: 4px solid #ffd700;
        padding: 15px;
        margin: 20px 0;
        border-radius: 4px;
      }
      .footer {
        font-size: 12px;
        color: #666;
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #ddd;
      }
      .expiration-warning {
        color: #d9534f;
        font-weight: bold;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Angelus Investorenportal</h1>
      </div>
      
      <div class="content">
        <div class="greeting">
          <p>Liebe/r ${firstName} ${lastName},</p>
          <p>herzlich willkommen im Angelus Investorenportal! Sie wurden eingeladen, Ihr Bestandsinvestor-Konto zu registrieren und zu aktivieren.</p>
        </div>

        <p>Klicken Sie auf den folgenden Link, um sich zu registrieren:</p>
        
        <div style="text-align: center;">
          <a href="${registrationUrl}" class="button">Jetzt registrieren</a>
        </div>

        <div class="info-box">
          <p><strong>Oder kopieren Sie diesen Link in Ihren Browser:</strong></p>
          <p style="word-break: break-all; font-size: 12px;">${registrationUrl}</p>
        </div>

        <div class="info-box">
          <p><strong>⏰ Wichtig:</strong> <span class="expiration-warning">Dieser Link ist gültig bis ${expirationDate}</span></p>
          <p>Nach diesem Datum müssen Sie eine neue Einladung anfordern.</p>
        </div>

        <p>Bei der Registrierung werden Sie aufgefordert:</p>
        <ul>
          <li>Ein sicheres Passwort zu erstellen</li>
          <li>Ihre Daten zu bestätigen</li>
          <li>Wichtige Dokumente zu akzeptieren</li>
        </ul>

        <p>Falls Sie Fragen haben oder Hilfe benötigen, kontaktieren Sie uns bitte unter:</p>
        <p>
          <strong>Angelus Group</strong><br>
          📧 office@angelus.group<br>
          📞 0800 175 077 0
        </p>

        <div class="footer">
          <p>Dies ist eine automatisch generierte E-Mail. Bitte antworten Sie nicht auf diese E-Mail.</p>
          <p>&copy; 2026 Angelus Group. Alle Rechte vorbehalten.</p>
        </div>
      </div>
    </div>
  </body>
</html>
  `;

  const textContent = `
Angelus Investorenportal

Liebe/r ${firstName} ${lastName},

herzlich willkommen im Angelus Investorenportal! Sie wurden eingeladen, Ihr Bestandsinvestor-Konto zu registrieren und zu aktivieren.

Registrierungslink:
${registrationUrl}

⏰ WICHTIG: Dieser Link ist gültig bis ${expirationDate}
Nach diesem Datum müssen Sie eine neue Einladung anfordern.

Bei der Registrierung werden Sie aufgefordert:
- Ein sicheres Passwort zu erstellen
- Ihre Daten zu bestätigen
- Wichtige Dokumente zu akzeptieren

Falls Sie Fragen haben oder Hilfe benötigen, kontaktieren Sie uns bitte unter:
Angelus Group
office@angelus.group
0800 175 077 0

---
Dies ist eine automatisch generierte E-Mail. Bitte antworten Sie nicht auf diese E-Mail.
© 2026 Angelus Group. Alle Rechte vorbehalten.
  `;

  try {
    const result = await resend.emails.send({
      from: 'Angelus Investorenportal <noreply@angelus.group>',
      to: email,
      subject: 'Einladung: Registrieren Sie sich im Angelus Investorenportal',
      html: htmlContent,
      text: textContent,
    });

    if (result.error) {
      console.error('Resend error:', result.error);
      throw new Error(`Failed to send email: ${result.error.message}`);
    }

    console.log(`Invitation email sent to ${email}:`, result.data);
    return result.data;
  } catch (error) {
    console.error('Error sending invitation email:', error);
    throw error;
  }
}
