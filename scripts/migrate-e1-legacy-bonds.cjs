// E1 (1:n-Umbau): legt Tabelle legacy_bonds an + fuegt legacy_bond_id (NULLABLE, additiv) an
// payment_history & interest_calculations. IDEMPOTENT (CREATE TABLE IF NOT EXISTS + information_schema-
// Check pro Spalte). KEIN Drop, KEIN Backfill (das ist E2). Host-Guardrail. BEIDE DBs separat aufrufen.
//   railway run --service MySQL node scripts/migrate-e1-legacy-bonds.cjs            (acela)
//   node scripts/migrate-e1-legacy-bonds.cjs "mysql://<tramway>"                    (tramway)
const mysql = require('mysql2/promise');

const CREATE_LEGACY_BONDS = `
CREATE TABLE IF NOT EXISTS legacy_bonds (
  id INT NOT NULL AUTO_INCREMENT,
  legacy_customer_id INT NOT NULL,
  contract_number VARCHAR(20) NOT NULL,
  bond_id INT NULL,
  bond_number VARCHAR(50) NULL,
  contract_date DATE NULL,
  value_date DATE NULL,
  investment_amount DECIMAL(15,2) NULL,
  share_count INT NULL,
  share_value DECIMAL(15,2) NULL,
  annual_interest_rate DECIMAL(5,2) NULL,
  interest_payment_frequency ENUM('monthly','quarterly','annual') DEFAULT 'monthly',
  annual_interest_date DATE NULL,
  monthly_payment_day INT NULL,
  maturity_date DATE NULL,
  term_months INT NULL,
  refinancing_rate DECIMAL(5,2) NULL,
  risk_classification VARCHAR(64) NULL,
  zinsbasis VARCHAR(16) DEFAULT 'act/365',
  kuendigung_eingegangen_am DATE NULL,
  kuendigung_status VARCHAR(32) NULL,
  naechster_kuendigungstermin DATE NULL,
  vfe_satz DECIMAL(5,4) NULL,
  schadensersatz_teilbetrag DECIMAL(15,2) NULL,
  vergleichsfrist DATE NULL,
  status ENUM('pending','active','completed','cancelled') DEFAULT 'pending',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY idx_bond_contract_number (contract_number),
  KEY idx_bond_legacy_customer_id (legacy_customer_id),
  KEY idx_bond_status (status)
)`;

// (Tabelle, Spalte) -> additiv legacy_bond_id NULLABLE
const BOND_ID_TARGETS = ['legacy_customer_payment_history', 'legacy_customer_interest_calculations'];

function pickUrl() {
  if (process.argv[2] && process.argv[2].startsWith('mysql://')) return process.argv[2];
  const c = Object.entries(process.env).filter(([, v]) => typeof v === 'string' && v.startsWith('mysql://'));
  const pub = c.find(([, v]) => !/railway\.internal/.test(v));
  return pub ? pub[1] : process.env.DATABASE_URL;
}

async function hasColumn(conn, table, col) {
  const [r] = await conn.query(
    'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',
    [table, col]
  );
  return r.length > 0;
}

(async () => {
  const url = pickUrl();
  if (!url) { console.error('FEHLER: keine mysql://-URL'); process.exit(1); }
  const host = (url.match(/@([^:/]+)/) || [])[1] || '?';
  const dbName = (url.match(/\/([^/?]+)(\?|$)/) || [])[1] || '?';
  console.log(`[Guardrail] Ziel-Host=${host}  DB=${dbName}`);

  const conn = await mysql.createConnection({ uri: url });
  try {
    await conn.query(CREATE_LEGACY_BONDS);
    console.log('  + legacy_bonds: CREATE TABLE IF NOT EXISTS ok');

    for (const table of BOND_ID_TARGETS) {
      if (await hasColumn(conn, table, 'legacy_bond_id')) {
        console.log(`  = ${table}.legacy_bond_id: existiert bereits, skip`);
      } else {
        await conn.query(`ALTER TABLE ${table} ADD COLUMN legacy_bond_id INT NULL`);
        console.log(`  + ${table}.legacy_bond_id: hinzugefuegt (NULLABLE)`);
      }
    }
    console.log(`OK: E1-Schema auf ${host}/${dbName} abgeschlossen (kein Backfill).`);
  } finally {
    await conn.end();
  }
})();
