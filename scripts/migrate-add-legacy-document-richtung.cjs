// Additive Migration: legacy_customer_documents += richtung (Korrespondenz-Richtung eingehend/ausgehend).
// IDEMPOTENT (information_schema-Check), ADD COLUMN, KEIN drizzle-kit push. Host-Guardrail (druckt Ziel).
// Laeuft auf BEIDE DBs (acela=KG + tramway=MyBonds) — jeweils separat aufrufen.
//
// Nutzung:
//   railway run --service MySQL node scripts/migrate-add-legacy-document-richtung.cjs   (acela/KG)
//   node scripts/migrate-add-legacy-document-richtung.cjs "mysql://<tramway-url>"        (MyBonds)
const mysql = require('mysql2/promise');

const COLUMN = { name: 'richtung', ddl: 'ADD COLUMN richtung VARCHAR(16) NULL' };

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
  const dbName = (url.match(/\/([^/?]+)(\?|$)/) || [])[1] || '?';
  console.log(`[Guardrail] Ziel-Host=${host}  DB=${dbName}`);

  const conn = await mysql.createConnection({ uri: url });
  try {
    const [rows] = await conn.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='legacy_customer_documents' AND COLUMN_NAME=?",
      [COLUMN.name]
    );
    if (rows.length) {
      console.log(`  = ${COLUMN.name}: existiert bereits, skip`);
    } else {
      await conn.query(`ALTER TABLE legacy_customer_documents ${COLUMN.ddl}`);
      console.log(`  + ${COLUMN.name}: hinzugefuegt`);
    }
    console.log(`OK: Migration auf ${host}/${dbName} abgeschlossen.`);
  } finally {
    await conn.end();
  }
})();
