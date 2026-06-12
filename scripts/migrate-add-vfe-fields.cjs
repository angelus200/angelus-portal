// Additive Migration (Teil B): legacy_customers += VFE-Schlussabrechnungs-Verhandlungsgrößen.
// NUR gespeichert: vfe_satz, schadensersatz_teilbetrag, vergleichsfrist. Beträge (VFE/Schadensersatz/
// Vergleich) werden berechnet. IDEMPOTENT pro Spalte, ADD COLUMN, KEIN drizzle-kit push.
// Host-Guardrail (druckt Ziel). Laeuft auf BEIDE DBs (acela + tramway) — jeweils separat aufrufen.
//
// Nutzung:
//   railway run --service MySQL node scripts/migrate-add-vfe-fields.cjs            (acela/KG)
//   node scripts/migrate-add-vfe-fields.cjs "mysql://<tramway-url>"               (MyBonds)
const mysql = require('mysql2/promise');

const COLUMNS = [
  { name: 'vfe_satz',                 ddl: 'ADD COLUMN vfe_satz DECIMAL(5,4) NULL' },
  { name: 'schadensersatz_teilbetrag', ddl: 'ADD COLUMN schadensersatz_teilbetrag DECIMAL(15,2) NULL' },
  { name: 'vergleichsfrist',          ddl: 'ADD COLUMN vergleichsfrist DATE NULL' },
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
  const dbName = (url.match(/\/([^/?]+)(\?|$)/) || [])[1] || '?';
  console.log(`[Guardrail] Ziel-Host=${host}  DB=${dbName}`);

  const conn = await mysql.createConnection({ uri: url });
  try {
    for (const col of COLUMNS) {
      const [rows] = await conn.query(
        "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='legacy_customers' AND COLUMN_NAME=?",
        [col.name]
      );
      if (rows.length) { console.log(`  = ${col.name}: existiert bereits, skip`); continue; }
      await conn.query(`ALTER TABLE legacy_customers ${col.ddl}`);
      console.log(`  + ${col.name}: hinzugefuegt`);
    }
    console.log(`OK: VFE-Migration auf ${host}/${dbName} abgeschlossen.`);
  } finally {
    await conn.end();
  }
})();
