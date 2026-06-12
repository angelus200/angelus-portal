// A1-Korrektur: annual_interest_date von Bond 138180625 (Kirsten, Anleihe 60-2023) auf 01.06.
// Coupon-Termin der Serie 60-2023 = 31.05. (= Stichtag − 1 Tag), wie Brendel (DB: 2024-06-01).
// Falsch war 2025-06-26 (= valueDate) -> erster Termin lag in der Zukunft -> faelligeCoupons=0 -> +33.511.
// Kein Engine-Eingriff (Engine rechnet bereits: Vorfin mindert den Coupon). NUR ein Datenfeld.
// IDEMPOTENT (setzt einen festen Wert). Host-Guardrail acela (Kirsten existiert nur auf KG; tramway
// hat keine Bestandszeichner -> dort kein solcher Bond).
//   railway run --service MySQL node scripts/fix-a1-coupon-termin.cjs
const mysql = require('mysql2/promise');
const CONTRACT = '138180625';
const NEU = '2025-06-01'; // MM-DD=06-01 ist massgeblich (Engine nutzt nur Monat/Tag); Jahr kosmetisch

function pickUrl() {
  const c = Object.entries(process.env).filter(([, v]) => typeof v === 'string' && v.startsWith('mysql://'));
  const pub = c.find(([, v]) => !/railway\.internal/.test(v));
  return pub ? pub[1] : process.env.DATABASE_URL;
}

(async () => {
  const url = pickUrl();
  const host = (url.match(/@([^:/]+)/) || [])[1] || '?';
  console.log(`[Guardrail] Ziel-Host=${host}`);
  if (!host.includes('acela')) { console.error('ABBRUCH: nicht acela (KG).'); process.exit(2); }

  const conn = await mysql.createConnection({ uri: url });
  try {
    const [before] = await conn.query(
      "SELECT id, contract_number, DATE_FORMAT(annual_interest_date,'%Y-%m-%d') aid FROM legacy_bonds WHERE contract_number=?", [CONTRACT]);
    if (!before.length) { console.error(`ABBRUCH: Bond ${CONTRACT} nicht gefunden.`); process.exit(3); }
    console.log(`  vorher : Bond ${before[0].id} annual_interest_date=${before[0].aid}`);
    await conn.query('UPDATE legacy_bonds SET annual_interest_date=? WHERE contract_number=?', [NEU, CONTRACT]);
    const [after] = await conn.query(
      "SELECT DATE_FORMAT(annual_interest_date,'%Y-%m-%d') aid FROM legacy_bonds WHERE contract_number=?", [CONTRACT]);
    console.log(`  nachher: annual_interest_date=${after[0].aid}`);
    console.log('OK: A1 Coupon-Termin korrigiert (Termin jetzt 31.05.).');
  } catch (e) {
    console.error('FEHLER:', e.message); process.exitCode = 1;
  } finally { await conn.end(); }
})();
