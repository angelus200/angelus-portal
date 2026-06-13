// K-FIX: Kündigungs-/Laufzeitdaten je Kirsten-Bond setzen (acela). Reine Metadaten — KEIN Eingriff in
// Saldo/Zins/Rumpfjahr (Anker 312,50/28.856,04/23.842,39/52.385,93 bleiben). § + Intervall sind Serien-
// Config im CODE (vollzahler-perioden.ts), NICHT hier. Hier nur die Pro-Bond-DATEN:
//   - A1 60-2023 (echte Mindestlaufzeit): maturity 2028-06-26 + nächster Kündigungstermin 2029-05-31.
//   - A2/A3 KI 06-2022 (keine Mindestlaufzeit): nur nächster Kündigungstermin 2028-09-30 (maturity NULL).
// Datumswerte als STRING (kein Date-Objekt -> kein TZ-Tag-Shift, 26.06. darf nicht zu 25.06. werden).
// IDEMPOTENT (feste Werte). Host-Guardrail HART auf acela.
//   railway run --service MySQL node scripts/fix-kirsten-kuendigung.cjs
const mysql = require('mysql2/promise');

const UPDATES = [
  { contract: '138180625', maturity: '2028-06-26', naechster: '2029-05-31' }, // A1 60-2023
  { contract: '113281022', maturity: null,         naechster: '2028-09-30' }, // A2 KI 06-2022
  { contract: '125280223', maturity: null,         naechster: '2028-09-30' }, // A3 KI 06-2022
];

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
    for (const u of UPDATES) {
      const [r] = await conn.query(
        'UPDATE legacy_bonds SET maturity_date = ?, naechster_kuendigungstermin = ? WHERE contract_number = ?',
        [u.maturity, u.naechster, u.contract],
      );
      const [chk] = await conn.query(
        "SELECT bond_number, DATE_FORMAT(maturity_date,'%Y-%m-%d') mat, DATE_FORMAT(naechster_kuendigungstermin,'%Y-%m-%d') nkt FROM legacy_bonds WHERE contract_number = ?",
        [u.contract],
      );
      const c = chk[0];
      console.log(`  ${u.contract} (${c.bond_number}): maturity=${c.mat ?? 'NULL'} · nächster=${c.nkt}  [affected ${r.affectedRows}]`);
    }
    console.log('OK: Kündigungs-/Laufzeitdaten gesetzt (acela).');
  } catch (e) {
    console.error('FEHLER:', e.message); process.exitCode = 1;
  } finally { await conn.end(); }
})();
