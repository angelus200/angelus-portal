#!/usr/bin/env tsx
/**
 * Setzt alle 5 deutschen Clerk Email-Templates via Clerk Backend API.
 * Ausführen: npx tsx scripts/set-clerk-templates.ts
 *
 * Benötigt CLERK_SECRET_KEY in .env oder als Umgebungsvariable.
 */

import * as fs from "fs";
import * as path from "path";

// Load .env manually (no dotenv dependency required)
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnv();

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || process.argv[2];

if (!CLERK_SECRET_KEY) {
  console.error("❌  CLERK_SECRET_KEY fehlt. Bitte in .env setzen oder als Argument übergeben.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Template definitions
// ---------------------------------------------------------------------------

const BASE_STYLE = `
  <style>
    body { margin: 0; padding: 0; background: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    .header { background: #0f172a; padding: 32px 40px; text-align: center; }
    .header img { height: 48px; margin-bottom: 12px; }
    .header-title { color: #f59e0b; font-size: 20px; font-weight: 700; letter-spacing: .5px; margin: 0; }
    .body { padding: 40px; color: #1e293b; }
    .body h1 { font-size: 22px; font-weight: 700; margin: 0 0 12px; color: #0f172a; }
    .body p { font-size: 15px; line-height: 1.6; margin: 0 0 16px; color: #475569; }
    .code-box { background: #f8fafc; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
    .code-box span { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f172a; font-family: 'Courier New', monospace; }
    .btn { display: inline-block; background: #f59e0b; color: #000000 !important; font-weight: 700; font-size: 15px; text-decoration: none; padding: 14px 32px; border-radius: 6px; margin: 20px 0; }
    .divider { border: none; border-top: 1px solid #e2e8f0; margin: 32px 0; }
    .footer { padding: 24px 40px; background: #f8fafc; text-align: center; }
    .footer p { font-size: 12px; color: #94a3b8; margin: 4px 0; }
    .footer a { color: #f59e0b; text-decoration: none; }
    .warning { background: #fff7ed; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #92400e; margin: 16px 0; }
  </style>
`;

const FOOTER_HTML = `
  <div class="footer">
    <p><strong>Angelus Group GmbH</strong></p>
    <p>Professionelle Kapitalanlagen für anspruchsvolle Investoren</p>
    <p style="margin-top:12px;">
      <a href="{{app_domain}}/impressum">Impressum</a> &nbsp;·&nbsp;
      <a href="{{app_domain}}/privacy">Datenschutz</a>
    </p>
    <p style="margin-top:8px; font-size:11px; color:#cbd5e1;">
      Sie erhalten diese E-Mail, weil ein Konto bei Angelus Group mit Ihrer E-Mail-Adresse besteht.<br>
      Bei Fragen: <a href="mailto:office@angelus.group">office@angelus.group</a>
    </p>
  </div>
`;

function wrapHtml(content: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${BASE_STYLE}
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <p class="header-title">ANGELUS GROUP</p>
    </div>
    <div class="body">
      ${content}
    </div>
    ${FOOTER_HTML}
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// The 5 templates
// ---------------------------------------------------------------------------

interface Template {
  slug: string;
  name: string;
  subject: string;
  body: string;
}

const templates: Template[] = [
  // 1. verification_code  (OTP / Email-Verifizierung)
  {
    slug: "verification_code",
    name: "E-Mail-Verifizierung",
    subject: "Ihr Verifizierungscode – Angelus Group",
    body: wrapHtml(`
      <h1>Ihr Verifizierungscode</h1>
      <p>Hallo,</p>
      <p>bitte verwenden Sie den folgenden Code, um Ihre E-Mail-Adresse zu bestätigen. Der Code ist <strong>10 Minuten</strong> gültig.</p>
      <div class="code-box">
        <span>{{otp_code}}</span>
      </div>
      <div class="warning">
        ⚠️ Teilen Sie diesen Code niemals mit Dritten. Mitarbeiter der Angelus Group werden Sie niemals nach diesem Code fragen.
      </div>
      <p>Falls Sie diese Anfrage nicht initiiert haben, können Sie diese E-Mail ignorieren.</p>
    `),
  },

  // 2. invitation  (Einladung)
  {
    slug: "invitation",
    name: "Einladung zum Investorenportal",
    subject: "Ihre Einladung zum Angelus Investorenportal",
    body: wrapHtml(`
      <h1>Willkommen im Angelus Investorenportal</h1>
      <p>Hallo,</p>
      <p>Sie wurden eingeladen, dem <strong>Angelus Investorenportal</strong> beizutreten – Ihrer zentralen Plattform für die Verwaltung Ihrer Kapitalanlagen.</p>
      <p>Klicken Sie auf den Button, um Ihr Konto einzurichten:</p>
      <p style="text-align:center;">
        <a href="{{action_url}}" class="btn">Konto jetzt einrichten</a>
      </p>
      <hr class="divider">
      <p style="font-size:13px; color:#64748b;">Diese Einladung ist <strong>48 Stunden</strong> gültig. Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:</p>
      <p style="font-size:12px; word-break:break-all; color:#94a3b8;">{{action_url}}</p>
    `),
  },

  // 3. reset_password_code  (korrekter Slug laut API)
  {
    slug: "reset_password_code",
    name: "Passwort zurücksetzen",
    subject: "Passwort zurücksetzen – Angelus Group",
    body: wrapHtml(`
      <h1>Passwort zurücksetzen</h1>
      <p>Hallo,</p>
      <p>wir haben eine Anfrage zum Zurücksetzen Ihres Passworts erhalten. Verwenden Sie den folgenden Code, um ein neues Passwort festzulegen:</p>
      <div class="code-box">
        <span>{{otp_code}}</span>
      </div>
      <div class="warning">
        ⚠️ Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren. Ihr Passwort bleibt unverändert.
      </div>
      <p style="font-size:13px; color:#64748b;">Dieser Code ist <strong>1 Stunde</strong> gültig.</p>
    `),
  },

  // 4. magic_link_sign_in  (korrekter Slug laut API)
  {
    slug: "magic_link_sign_in",
    name: "Magic Link – Anmeldung",
    subject: "Ihr Anmeldelink – Angelus Group",
    body: wrapHtml(`
      <h1>Ihr persönlicher Anmeldelink</h1>
      <p>Hallo,</p>
      <p>klicken Sie auf den folgenden Button, um sich sofort und ohne Passwort anzumelden:</p>
      <p style="text-align:center;">
        <a href="{{magic_link}}" class="btn">Jetzt anmelden</a>
      </p>
      <hr class="divider">
      <div class="warning">
        ⚠️ Dieser Link kann nur einmal verwendet werden und ist <strong>10 Minuten</strong> gültig. Teilen Sie ihn nicht mit anderen Personen.
      </div>
      <p style="font-size:13px; color:#64748b;">Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:</p>
      <p style="font-size:12px; word-break:break-all; color:#94a3b8;">{{magic_link}}</p>
      <p style="font-size:13px; color:#64748b;">Falls Sie keine Anmeldung angefordert haben, können Sie diese E-Mail ignorieren.</p>
    `),
  },

  // 5. passkey_added
  {
    slug: "passkey_added",
    name: "Passkey hinzugefügt",
    subject: "Neuer Passkey für Ihren Account – Angelus Group",
    body: wrapHtml(`
      <h1>Neuer Passkey registriert</h1>
      <p>Hallo,</p>
      <p>für den Account <strong>{{primary_email_address}}</strong> wurde soeben ein neuer <strong>Passkey</strong> (Gerät: <em>{{passkey_name}}</em>) registriert.</p>
      <p>Ab sofort können Sie sich mit diesem Gerät schnell und sicher anmelden.</p>
      <hr class="divider">
      <div class="warning">
        ⚠️ Falls Sie diesen Passkey nicht selbst hinzugefügt haben, sichern Sie Ihren Account sofort und kontaktieren Sie uns unter <a href="mailto:office@angelus.group">office@angelus.group</a>.
      </div>
    `),
  },
];

// ---------------------------------------------------------------------------
// API call
// ---------------------------------------------------------------------------

async function setTemplate(template: Template, secretKey: string): Promise<{ ok: boolean; error?: string }> {
  const url = `https://api.clerk.com/v1/templates/email/${template.slug}`;
  const payload = {
    name: template.name,
    subject: template.subject,
    markup: template.body,
    body: template.body,
    delivered_by_clerk: true,
  };

  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n🔑  Clerk Email-Templates setzen\n");
  console.log(`   API-Key: sk_...${CLERK_SECRET_KEY!.slice(-6)}\n`);

  const results: { slug: string; name: string; ok: boolean; error?: string }[] = [];

  for (const tpl of templates) {
    process.stdout.write(`   ⏳  ${tpl.name} (${tpl.slug}) … `);
    const result = await setTemplate(tpl, CLERK_SECRET_KEY!);
    results.push({ slug: tpl.slug, name: tpl.name, ...result });
    if (result.ok) {
      console.log("✅");
    } else {
      console.log(`❌  ${result.error}`);
    }
  }

  console.log("\n────────────────────────────────────────");
  const ok = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok).length;
  console.log(`   Ergebnis: ${ok}/${templates.length} Templates erfolgreich gesetzt`);
  if (fail > 0) {
    console.log(`\n   Fehlgeschlagen:`);
    results.filter(r => !r.ok).forEach(r => console.log(`   • ${r.name}: ${r.error}`));
  }
  console.log("────────────────────────────────────────\n");

  if (fail > 0) process.exit(1);
}

main().catch(err => {
  console.error("Unerwarteter Fehler:", err);
  process.exit(1);
});
