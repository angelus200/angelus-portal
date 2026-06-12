// P7 Post-Deploy-Verify (HTTP gegen portal.angelus.capital). Login brendel-test (Passwort aus
// Downloads) -> myVollzahlerKonto + myKontokorrent. Plus Brenner read-only (DB). Erkennt auch,
// ob der neue Code schon deployt ist (Feld `saldo` vorhanden).
//   Nutzung: railway run --service MySQL node scripts/verify-brendel-p7.cjs
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
async function q(pathName, cookie) {
  const input = encodeURIComponent(JSON.stringify({ 0: { json: null } }));
  const res = await fetch(`${BASE}/api/trpc/${pathName}?batch=1&input=${input}`, { headers: { cookie } });
  const j = await res.json();
  return j?.[0]?.result?.data?.json;
}

(async () => {
  const password = readPassword();
  const loginRes = await fetch(`${BASE}/api/trpc/auth.login?batch=1`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ 0: { json: { email: EMAIL, password } } }),
  });
  const setCookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [];
  const cookie = setCookies.map((c) => c.split(';')[0]).join('; ');
  console.log('LOGIN:', loginRes.status, '| session:', /angelus_session/.test(cookie));
  if (!/angelus_session/.test(cookie)) { console.error('ABBRUCH: kein Session-Cookie'); process.exit(1); }

  const vz = await q('legacyCustomer.myVollzahlerKonto', cookie);
  const kk = await q('legacyCustomer.myKontokorrent', cookie);

  if (!vz || vz.saldo === undefined) {
    console.log('\n⏳ DEPLOY NOCH NICHT LIVE — myVollzahlerKonto hat kein Feld `saldo` (alter Code).');
    console.log('   vz keys:', vz ? Object.keys(vz).join(',') : 'null');
    process.exit(2);
  }

  console.log('\n=== myVollzahlerKonto ===');
  console.log('  Perioden:');
  (vz.perioden || []).forEach((p) => console.log(`    ${p.von}..${p.bis}  ${p.zins}€  erhalten ${p.erhaltenInPeriode}  ${p.status.toUpperCase()}${p.deckungsluecke ? ` (offen ${p.deckungsluecke})` : ''}${p.unterVorbehalt ? ' *' : ''}`));
  console.log('  Saldo:', JSON.stringify(vz.saldo));
  console.log('  Rückzahlung:', JSON.stringify(vz.rueckzahlung));
  console.log('=== myKontokorrent ===', JSON.stringify(kk));

  const per = vz.perioden || [];
  const checks = [
    ['Rumpfjahr erfüllt 11.100', per[0]?.status === 'erfuellt' && per[0]?.erhaltenInPeriode === 11100],
    ['1. Jahr teilweise offen 1.500', per[1]?.status === 'teilweise' && per[1]?.deckungsluecke === 1500],
    ['laufend offen + Vorbehalt', per[2]?.status === 'offen' && per[2]?.unterVorbehalt === true],
    ['Saldo +313,50', vz.saldo?.saldo === 313.5],
    ['HABEN 1.500 / SOLL 1.813,50', vz.saldo?.habenOffenerKupon === 1500 && vz.saldo?.sollVorfinanzierung === 1813.5],
    ['nächster Coupon 2027-05-31/18.000', vz.saldo?.naechsterCoupon?.datum === '2027-05-31' && vz.saldo?.naechsterCoupon?.betrag === 18000],
    ['myKontokorrent konfiguriert:false', kk?.konfiguriert === false],
  ];
  console.log('\n=== AUSWERTUNG ===');
  for (const [l, ok] of checks) console.log(`  ${ok ? '✓' : '✗'} ${l}`);
  const allOk = checks.every(([, ok]) => ok);

  const conn = await mysql.createConnection({ uri: pickUrl() });
  const [br] = await conn.query("SELECT lc.id, lc.investment_amount inv, (SELECT COALESCE(SUM(amount),0) FROM legacy_customer_payment_history WHERE legacy_customer_id=lc.id AND payment_type='initial_investment') ein FROM legacy_customers lc WHERE last_name='Brenner'");
  await conn.end();
  const offenBr = Number(br[0].inv) - Number(br[0].ein);
  console.log(`\n=== BRENNER (read-only) offen=${offenBr} ${offenBr > 0 ? '✓ Forderungspfad/kontinuierliche Engine intakt' : '✗'} ===`);

  console.log(`\n=== ERGEBNIS: ${allOk && offenBr > 0 ? 'ALLE GRÜN' : 'ABWEICHUNG'} ===`);
  process.exit(allOk && offenBr > 0 ? 0 : 1);
})().catch((e) => { console.error('VERIFY-FEHLER:', e.message); process.exit(1); });
