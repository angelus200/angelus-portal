// P5 Verify: echter HTTP-Pfad gegen portal.angelus.capital.
// Login brendel-test (Passwort aus Downloads, nie aus Output) -> Session-Cookie ->
// legacyCustomer.myVollzahlerKonto + myKontokorrent. Plus read-only Brenner-Stichprobe (DB).
//
// Nutzung: railway run --service MySQL node scripts/verify-brendel.cjs
const mysql = require('mysql2/promise');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BASE = 'https://portal.angelus.capital';
const EMAIL = 'brendel-test@angelus.group';

function readPassword() {
  const f = path.join(os.homedir(), 'Downloads', 'brendel-test-login.txt');
  const m = fs.readFileSync(f, 'utf8').match(/Passwort:\s*(.+)/);
  if (!m) throw new Error('Passwort nicht in Downloads-Datei gefunden');
  return m[1].trim();
}

function pickUrl() {
  const c = Object.entries(process.env).filter(([, v]) => typeof v === 'string' && v.startsWith('mysql://'));
  const pub = c.find(([, v]) => !/railway\.internal/.test(v));
  return pub ? pub[1] : process.env.DATABASE_URL;
}

async function trpcQuery(pathName, cookie) {
  const input = encodeURIComponent(JSON.stringify({ 0: { json: null } }));
  const res = await fetch(`${BASE}/api/trpc/${pathName}?batch=1&input=${input}`, {
    headers: { cookie, 'content-type': 'application/json' },
  });
  const j = await res.json();
  return j?.[0]?.result?.data?.json;
}

(async () => {
  const password = readPassword();

  // 1) Login
  const loginRes = await fetch(`${BASE}/api/trpc/auth.login?batch=1`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ 0: { json: { email: EMAIL, password } } }),
  });
  const loginJson = await loginRes.json();
  const loginData = loginJson?.[0]?.result?.data?.json;
  const setCookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [];
  const cookie = setCookies.map((c) => c.split(';')[0]).join('; ');
  console.log('=== LOGIN ===');
  console.log('  status:', loginRes.status, '| result:', JSON.stringify(loginData), '| session-cookie gesetzt:', /angelus_session/.test(cookie));
  if (!/angelus_session/.test(cookie)) { console.error('  ABBRUCH: kein Session-Cookie'); process.exit(1); }

  // 2) myVollzahlerKonto
  const vz = await trpcQuery('legacyCustomer.myVollzahlerKonto', cookie);
  console.log('\n=== myVollzahlerKonto (erwartet: NICHT null) ===');
  console.log(JSON.stringify(vz, null, 2));

  // 3) myKontokorrent
  const kk = await trpcQuery('legacyCustomer.myKontokorrent', cookie);
  console.log('\n=== myKontokorrent (erwartet: { konfiguriert: false }) ===');
  console.log(JSON.stringify(kk));

  // 4) Auswertung
  console.log('\n=== AUSWERTUNG ===');
  const checks = [
    ['myVollzahlerKonto != null', vz != null],
    ['offen === 0', vz?.offen === 0],
    ['gezeichnet === 100000', vz?.gezeichnet === 100000],
    ['eingezahlt === 100000', vz?.eingezahlt === 100000],
    ['bereitsErhalten === 28500', vz?.bereitsErhalten === 28500],
    ['couponRate === 18', vz?.couponRate === 18],
    ["zinsbasis === '30E/360'", vz?.zinsbasis === '30E/360'],
    ['naechsteZinsfaelligkeit 2027-05-31 / 18000', vz?.naechsteZinsfaelligkeit?.datum === '2027-05-31' && vz?.naechsteZinsfaelligkeit?.betrag === 18000],
    ['rueckzahlung 2027-05-31 / 100000', vz?.rueckzahlung?.datum === '2027-05-31' && vz?.rueckzahlung?.betrag === 100000],
    ["kuendigungStatus === 'zurueckgewiesen'", vz?.kuendigungStatus === 'zurueckgewiesen'],
    ['naechsterKuendigungstermin 2027-05-31', String(vz?.naechsterKuendigungstermin).slice(0, 10) === '2027-05-31'],
    ['myKontokorrent konfiguriert === false (kein Forderungsfall)', kk?.konfiguriert === false],
  ];
  for (const [label, ok] of checks) console.log(`  ${ok ? '✓' : '✗'} ${label}`);
  const allOk = checks.every(([, ok]) => ok);

  // 5) Brenner-Stichprobe read-only (unberührt?)
  const url = pickUrl();
  const conn = await mysql.createConnection({ uri: url });
  const [b] = await conn.query(
    "SELECT id, user_id, contract_number, (SELECT COALESCE(SUM(amount),0) FROM legacy_customer_payment_history WHERE legacy_customer_id=lc.id AND payment_type='initial_investment') AS sum_init, (SELECT COUNT(*) FROM legacy_customer_payment_history WHERE legacy_customer_id=lc.id AND payment_type='initial_investment') AS n_init FROM legacy_customers lc WHERE last_name='Brenner'");
  await conn.end();
  console.log('\n=== BRENNER (unberührt, read-only) ===');
  console.table(b);
  const brennerOk = b.length === 1 && Number(b[0].sum_init) === 13000 && Number(b[0].n_init) === 9 && b[0].id === 1;
  console.log(`  ${brennerOk ? '✓' : '✗'} Brenner unverändert (id=1, Σinitial=13000, 9 Zeilen -> offen 87000, Forderungspfad intakt)`);

  console.log(`\n=== ERGEBNIS: ${allOk && brennerOk ? 'ALLE GRÜN' : 'ABWEICHUNG'} ===`);
  process.exitCode = allOk && brennerOk ? 0 : 1;
})().catch((e) => { console.error('VERIFY-FEHLER:', e.message); process.exit(1); });
