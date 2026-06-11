// Additive Migration: legacy_customers += zinsbasis (P2) + 3 Kuendigungs-Felder (P3).
// IDEMPOTENT pro Spalte (information_schema-Check), ADD COLUMN, KEIN drizzle-kit push.
// Host-Guardrail (druckt Ziel-Host). Laeuft auf BEIDE DBs (acela + tramway).
//
// Nutzung:
//   node scripts/migrate-add-vollzahler-kuendigung-fields.cjs ["mysql://<url>"]
//   - ohne Arg: erste public mysql://-URL aus Env (railway run --service MySQL)
const mysql = require('mysql2/promise');

const COLUMNS = [
  { name: 'zinsbasis',                   ddl: "ADD COLUMN zinsbasis VARCHAR(16) NULL DEFAULT 'act/365'" },
  { name: 'kuendigung_eingegangen_am',   ddl: 'ADD COLUMN kuendigung_eingegangen_am DATE NULL' },
  { name: 'kuendigung_status',           ddl: 'ADD COLUMN kuendigung_status VARCHAR(32) NULL' },
  { name: 'naechster_kuendigungstermin', ddl: 'ADD COLUMN naechster_kuendigungstermin DATE NULL' },
];

function pickUrl() {
  if (process.argv[2] && process.argv[2].startsWith('mysql://')) return process.argv[2];
  const c = Object.entries(process.env).filter(([, v]) => typeof v === 'string' && v.startsWith('mysql://'));
  const pub = c.find(([, v]) => !/railway\.internal/.test(v));
  return pub ? pub[1] : process.env.DATABASE_URL;
}

(async () => {
  const url = pickUrl();
  if (!url) { console.error('FEHLER: keine mysql://-URL gefunden'); process.exit(1); }
  const host = (url.match(/@([^:/]+)/) || [])[1] || '?';
  const dbName = (url.match(/\/([^/?]+)(\?|$)/) || [])[1] || '?';
  console.log(`[Guardrail] Ziel-Host=${host}  DB=${dbName}`);

  const conn = await mysql.createConnection({ uri: url });
  try {
    for (const col of COLUMNS) {
      const [rows] = await conn.query(
        "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='legacy_customers' AND COLUMN_NAME=?",
        [col.name]
      );
      if (rows.length) {
        console.log(`  = ${col.name}: existiert bereits, skip`);
        continue;
      }
      await conn.query(`ALTER TABLE legacy_customers ${col.ddl}`);
      console.log(`  + ${col.name}: hinzugefuegt`);
    }
    console.log(`OK: Migration auf ${host}/${dbName} abgeschlossen.`);
  } finally {
    await conn.end();
  }
})();
