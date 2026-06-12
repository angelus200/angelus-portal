// E2 (1:n-Umbau, Backfill): fuer JEDEN legacy_customer mit Anleihedaten EINE legacy_bonds-Zeile als
// 1:1-Kopie der heutigen Anleihe-Felder; danach payment_history.legacy_bond_id + interest_calc.legacy_bond_id
// aller Zeilen des Kunden auf diese Bond-id setzen. IDEMPOTENT (dedup per contract_number -> skip Insert).
// KEIN Code-Cutover (Engines lesen weiter aus legacy_customers; das ist E3). Host-Guardrail, BEIDE DBs separat.
//   railway run --service MySQL node scripts/migrate-e2-backfill-bonds.cjs            (acela)
//   node scripts/migrate-e2-backfill-bonds.cjs "mysql://<tramway>"                    (tramway)
const mysql = require('mysql2/promise');

// FELD-MAPPING legacy_customers.<spalte> -> legacy_bonds.<spalte> (name->name, 1:1). legacy_customer_id
// kommt aus legacy_customers.id. ALLE 14 Engine-Felder + VFE + kuendigung* + zinsbasis/refinancing enthalten:
const FIELDS = [
  'contract_number',            // Identifikation (UNIQUE in legacy_bonds)
  'bond_id', 'bond_number',     // Serie/Anleihe-Ref
  'contract_date', 'value_date', 'investment_amount', 'share_count', 'share_value', // Vertrag
  'annual_interest_rate', 'interest_payment_frequency', 'annual_interest_date', 'monthly_payment_day', // Zins (Coupon-Termin 31.05 via annual_interest_date)
  'maturity_date', 'term_months',                          // Laufzeit
  'refinancing_rate', 'risk_classification', 'zinsbasis',  // Forderung/Vorfinanzierung + 30E/360-Basis
  'kuendigung_eingegangen_am', 'kuendigung_status', 'naechster_kuendigungstermin', // Kündigung
  'vfe_satz', 'schadensersatz_teilbetrag', 'vergleichsfrist', // VFE-Schlussabrechnung
  'status',
];

function pickUrl() {
  if (process.argv[2] && process.argv[2].startsWith('mysql://')) return process.argv[2];
  const c = Object.entries(process.env).filter(([, v]) => typeof v === 'string' && v.startsWith('mysql://'));
  const pub = c.find(([, v]) => !/railway\.internal/.test(v));
  return pub ? pub[1] : process.env.DATABASE_URL;
}

(async () => {
  const url = pickUrl();
  if (!url) { console.error('FEHLER: keine mysql://-URL'); process.exit(1); }
  const host = (url.match(/@([^:/]+)/) || [])[1] || '?';
  console.log(`[Guardrail] Ziel-Host=${host}  (${FIELDS.length} Anleihe-Felder im Mapping)`);

  const conn = await mysql.createConnection({ uri: url });
  try {
    // Kandidaten: Bestandskunden mit Anleihedaten (contract_number + investment_amount gesetzt).
    const [customers] = await conn.query(
      'SELECT id, contract_number FROM legacy_customers WHERE contract_number IS NOT NULL AND investment_amount IS NOT NULL ORDER BY id'
    );
    const colList = FIELDS.join(', ');
    for (const cust of customers) {
      const [ex] = await conn.query('SELECT id FROM legacy_bonds WHERE contract_number=?', [cust.contract_number]);
      let bondId;
      if (ex.length) {
        bondId = ex[0].id;
        console.log(`  = Kunde ${cust.id} (${cust.contract_number}): Bond ${bondId} existiert, skip Insert`);
      } else {
        // 1:1-Kopie name->name; legacy_customer_id = legacy_customers.id
        await conn.query(
          `INSERT INTO legacy_bonds (legacy_customer_id, ${colList}) SELECT id, ${colList} FROM legacy_customers WHERE id=?`,
          [cust.id]
        );
        const [nb] = await conn.query('SELECT id FROM legacy_bonds WHERE contract_number=?', [cust.contract_number]);
        bondId = nb[0].id;
        console.log(`  + Kunde ${cust.id} (${cust.contract_number}): Bond ${bondId} angelegt (1:1)`);
      }
      // payment_history + interest_calc des Kunden mit der Bond-id verknuepfen (idempotent, 1:1).
      const [u1] = await conn.query('UPDATE legacy_customer_payment_history SET legacy_bond_id=? WHERE legacy_customer_id=?', [bondId, cust.id]);
      const [u2] = await conn.query('UPDATE legacy_customer_interest_calculations SET legacy_bond_id=? WHERE legacy_customer_id=?', [bondId, cust.id]);
      console.log(`    payment_history verknuepft: ${u1.affectedRows} | interest_calc: ${u2.affectedRows}`);
    }
    console.log(`OK: E2-Backfill auf ${host} abgeschlossen (${customers.length} Kunden).`);
  } finally {
    await conn.end();
  }
})();
