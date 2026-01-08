import { Resend } from "resend";

const resend = new Resend(process.env.Resend);

export async function sendPaymentConfirmationEmail(
  email: string,
  data: {
    investorName: string;
    bondName: string;
    amount: number;
    currency: string;
    paymentIntentId: string;
    date: Date;
    invoiceNumber?: string;
  }
) {
  const formattedDate = data.date.toLocaleDateString("de-DE");
  const formattedAmount = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: data.currency,
  }).format(data.amount);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Zahlungsbestätigung</h2>
      
      <p>Liebe/r ${data.investorName},</p>
      
      <p>vielen Dank für Ihre Zeichnung! Ihre Zahlung wurde erfolgreich verarbeitet.</p>
      
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Zahlungsdetails</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Beteiligung:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${data.bondName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Betrag:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${formattedAmount}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Datum:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>Zahlungs-ID:</strong></td>
            <td style="padding: 8px;">${data.paymentIntentId}</td>
          </tr>
          ${data.invoiceNumber ? `
          <tr>
            <td style="padding: 8px;"><strong>Rechnungsnummer:</strong></td>
            <td style="padding: 8px;">${data.invoiceNumber}</td>
          </tr>
          ` : ""}
        </table>
      </div>
      
      <p>Sie können Ihre Zeichnung jederzeit in Ihrem Investor-Dashboard einsehen.</p>
      
      <p>Bei Fragen kontaktieren Sie uns bitte unter support@angelus.group</p>
      
      <p>Beste Grüße,<br>Das Angelus Team</p>
    </div>
  `;

  try {
    const result = await resend.emails.send({
      from: "noreply@angelus.group",
      to: email,
      subject: `Zahlungsbestätigung - ${data.bondName}`,
      html,
    });

    return result;
  } catch (error) {
    console.error("Failed to send payment confirmation email:", error);
    throw error;
  }
}

export async function sendInvoiceEmail(
  email: string,
  data: {
    investorName: string;
    bondName: string;
    amount: number;
    currency: string;
    invoiceNumber: string;
    date: Date;
    invoicePdfUrl?: string;
  }
) {
  const formattedDate = data.date.toLocaleDateString("de-DE");
  const formattedAmount = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: data.currency,
  }).format(data.amount);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Ihre Rechnung</h2>
      
      <p>Liebe/r ${data.investorName},</p>
      
      <p>anbei erhalten Sie Ihre Rechnung für die Zeichnung.</p>
      
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Rechnungsdetails</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Rechnungsnummer:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${data.invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Beteiligung:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${data.bondName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Betrag:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${formattedAmount}</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>Datum:</strong></td>
            <td style="padding: 8px;">${formattedDate}</td>
          </tr>
        </table>
      </div>
      
      ${data.invoicePdfUrl ? `
      <p>
        <a href="${data.invoicePdfUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Rechnung herunterladen
        </a>
      </p>
      ` : ""}
      
      <p>Bei Fragen kontaktieren Sie uns bitte unter support@angelus.group</p>
      
      <p>Beste Grüße,<br>Das Angelus Team</p>
    </div>
  `;

  try {
    const result = await resend.emails.send({
      from: "noreply@angelus.group",
      to: email,
      subject: `Rechnung ${data.invoiceNumber}`,
      html,
    });

    return result;
  } catch (error) {
    console.error("Failed to send invoice email:", error);
    throw error;
  }
}
