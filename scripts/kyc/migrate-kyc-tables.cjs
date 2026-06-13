// KYC/AML-Sorgfaltsmodul Schema: 6 Tabellen anlegen. IDEMPOTENT (CREATE TABLE IF NOT EXISTS).
// Läuft auf BEIDE DBs (Schema-Parität, Prod-Schema-Regel): acela UND tramway.
// utf8mb4 ist Pflicht — Begründungen/Notizen enthalten §, –, „", €, Umlaute.
// Append-only: kyc_submissions, kyc_case_log werden NIE ge-updatet/gelöscht (nur INSERT) — der
// lückenlose Trail ist der Entlastungsnachweis. Dateien liegen verschlüsselt (kyc-crypto), in der
// DB nur Metadaten (kyc_documents).
//   railway run --service MySQL node scripts/kyc/migrate-kyc-tables.cjs   (acela)
//   danach auf tramway linken und erneut ausführen.
const mysql = require('mysql2/promise');

function pickUrl() {
  const c = Object.entries(process.env).filter(([, v]) => typeof v === 'string' && v.startsWith('mysql://'));
  const pub = c.find(([, v]) => !/railway\.internal/.test(v));
  return pub ? pub[1] : process.env.DATABASE_URL;
}

const CHARSET = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

const DDL = {
  kyc_submissions: `CREATE TABLE IF NOT EXISTS kyc_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  kyc_version VARCHAR(16) NOT NULL,
  status ENUM('eingereicht','in_pruefung','akzeptiert','abgelehnt','nachforderung','verweigert') NOT NULL DEFAULT 'eingereicht',
  server_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_kyc_sub_user (user_id)
) ${CHARSET}`,

  kyc_submission_fields: `CREATE TABLE IF NOT EXISTS kyc_submission_fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  submission_id INT NOT NULL,
  field_key VARCHAR(64) NOT NULL,
  field_value TEXT NULL,
  KEY idx_kyc_field_sub (submission_id)
) ${CHARSET}`,

  kyc_documents: `CREATE TABLE IF NOT EXISTS kyc_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  submission_id INT NOT NULL,
  user_id INT NOT NULL,
  doc_type VARCHAR(64) NOT NULL,
  file_path VARCHAR(512) NOT NULL,
  original_filename VARCHAR(255) NULL,
  mime_type VARCHAR(128) NULL,
  size INT NULL,
  encrypted BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_kyc_doc_sub (submission_id),
  KEY idx_kyc_doc_user (user_id)
) ${CHARSET}`,

  kyc_risk_assessment: `CREATE TABLE IF NOT EXISTS kyc_risk_assessment (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  submission_id INT NULL,
  risk_level ENUM('niedrig','mittel','hoch') NOT NULL,
  begruendung TEXT NULL,
  assessed_by INT NULL,
  assessed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_kyc_risk_user (user_id)
) ${CHARSET}`,

  kyc_case_log: `CREATE TABLE IF NOT EXISTS kyc_case_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  submission_id INT NULL,
  event_type VARCHAR(48) NOT NULL,
  actor VARCHAR(128) NULL,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_kyc_log_user (user_id)
) ${CHARSET}`,

  kyc_escalation: `CREATE TABLE IF NOT EXISTS kyc_escalation (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  flagged_by INT NULL,
  flagged_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  grund TEXT NULL,
  status ENUM('offen','an_anwalt_uebergeben','an_FIU_gemeldet','erledigt') NOT NULL DEFAULT 'offen',
  uebergeben_an_anwalt_am DATETIME NULL,
  anwalt_referenz VARCHAR(128) NULL,
  fiu_aktenzeichen VARCHAR(128) NULL,
  KEY idx_kyc_esc_user (user_id)
) ${CHARSET}`,
};

(async () => {
  const url = pickUrl();
  const host = (url.match(/@([^:/]+)/) || [])[1] || '?';
  console.log(`[Guardrail] Ziel-Host=${host}`);
  if (!/acela|tramway/.test(host)) { console.error('ABBRUCH: Host weder acela noch tramway.'); process.exit(2); }

  const conn = await mysql.createConnection({ uri: url });
  try {
    for (const [name, ddl] of Object.entries(DDL)) {
      await conn.query(ddl);
      console.log(`  ✓ ${name}`);
    }
    const names = Object.keys(DDL);
    const [t] = await conn.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN (${names.map(() => '?').join(',')})`,
      names,
    );
    const found = t.map((r) => r.TABLE_NAME || r.table_name);
    console.log(`Tabellen vorhanden (${found.length}/${names.length}): ${found.join(', ')}`);
    if (found.length !== names.length) { console.error('WARNUNG: nicht alle Tabellen vorhanden!'); process.exitCode = 1; }
    else console.log(`OK: kyc-Tabellen migriert auf ${host}.`);
  } catch (e) {
    console.error('FEHLER:', e.message); process.exitCode = 1;
  } finally { await conn.end(); }
})();
