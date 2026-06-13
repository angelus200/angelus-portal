// FAQ-Gate Schema: faq_versions + faq_acknowledgements anlegen. IDEMPOTENT (CREATE TABLE IF NOT
// EXISTS). Läuft auf BEIDE DBs (Schema-Parität, Prod-Schema-Regel): acela UND tramway.
// utf8mb4 ist Pflicht — der FAQ-Volltext enthält §, –, „", €; ohne utf8mb4 kippt der content_hash.
//   railway run --service MySQL node scripts/faq/migrate-faq-tables.cjs   (acela)
//   danach auf tramway linken und erneut ausführen.
const mysql = require('mysql2/promise');

function pickUrl() {
  const c = Object.entries(process.env).filter(([, v]) => typeof v === 'string' && v.startsWith('mysql://'));
  const pub = c.find(([, v]) => !/railway\.internal/.test(v));
  return pub ? pub[1] : process.env.DATABASE_URL;
}

const DDL_VERSIONS = `CREATE TABLE IF NOT EXISTS faq_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  faq_version VARCHAR(16) NOT NULL UNIQUE,
  content LONGTEXT NOT NULL,
  content_hash CHAR(64) NOT NULL,
  published_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

const DDL_ACKS = `CREATE TABLE IF NOT EXISTS faq_acknowledgements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  faq_version VARCHAR(16) NOT NULL,
  faq_content_hash CHAR(64) NOT NULL,
  confirmation_text TEXT NOT NULL,
  scrolled_to_end BOOLEAN NOT NULL DEFAULT FALSE,
  gating_completed_at DATETIME NULL,
  server_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_faq_ack_user_version (user_id, faq_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

(async () => {
  const url = pickUrl();
  const host = (url.match(/@([^:/]+)/) || [])[1] || '?';
  console.log(`[Guardrail] Ziel-Host=${host}`);
  if (!/acela|tramway/.test(host)) { console.error('ABBRUCH: Host weder acela noch tramway.'); process.exit(2); }

  const conn = await mysql.createConnection({ uri: url });
  try {
    await conn.query(DDL_VERSIONS);
    await conn.query(DDL_ACKS);
    const [t] = await conn.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('faq_versions','faq_acknowledgements')",
    );
    console.log(`Tabellen vorhanden: ${t.map((r) => r.TABLE_NAME || r.table_name).join(', ')}`);
    console.log(`OK: faq-Tabellen migriert auf ${host}.`);
  } catch (e) {
    console.error('FEHLER:', e.message); process.exitCode = 1;
  } finally { await conn.end(); }
})();
