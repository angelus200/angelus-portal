// Additive Enum-Migration: legacy_customer_documents.document_type += 'zeichnungsschein'
// READ-then-ALTER, IDEMPOTENT, mit Host-Guardrail. Bewusst NICHT drizzle-kit push (Drift-DROP-Risiko).
//
// Nutzung:
//   node scripts/migrate-add-zeichnungsschein-enum.cjs ["mysql://<url>"]
//   - mit Arg: nutzt die uebergebene URL (z.B. tramway/MyBonds public proxy)
//   - ohne Arg: nimmt die erste public mysql://-URL aus der Env (railway run --service MySQL = acela/KG)
const mysql = require('mysql2/promise');

// MUSS exakt der Reihenfolge in drizzle/legacy-schema.ts entsprechen (sonst Drift bei spaeterem generate).
const ENUM_VALUES = [
  'contract', 'projection', 'interest_calculation', 'payment_confirmation',
  'tax_certificate', 'bank_statement', 'zeichnungsschein', 'other',
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
    const [cols] = await conn.query(
      "SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='legacy_customer_documents' AND COLUMN_NAME='document_type'"
    );
    if (!cols.length) { console.error('FEHLER: Spalte document_type nicht gefunden — falsche DB?'); process.exit(1); }
    console.log('[vorher] ', cols[0].COLUMN_TYPE);
    if (cols[0].COLUMN_TYPE.includes("'zeichnungsschein'")) {
      console.log('OK: zeichnungsschein bereits vorhanden — nichts zu tun (idempotent).');
      return;
    }
    const enumSql = ENUM_VALUES.map((v) => `'${v}'`).join(',');
    await conn.query(`ALTER TABLE legacy_customer_documents MODIFY COLUMN document_type ENUM(${enumSql}) NOT NULL`);
    const [after] = await conn.query(
      "SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='legacy_customer_documents' AND COLUMN_NAME='document_type'"
    );
    console.log('[nachher]', after[0].COLUMN_TYPE);
    console.log(`OK: Migration angewandt auf ${host}/${dbName}`);
  } finally {
    await conn.end();
  }
})();
