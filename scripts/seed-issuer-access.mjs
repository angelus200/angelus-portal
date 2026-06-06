// scripts/seed-issuer-access.mjs
// Bestandsrecht: alle existierenden Investoren (role='user') bekommen approved
// für BEIDE deutschen Emittenten — es bricht nichts, alle können weiter zeichnen.
// Idempotent (INSERT IGNORE über Unique-Index uq_user_issuer).
// Aufruf:  $env:DB_PASS="..." ; node scripts/seed-issuer-access.mjs
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host: 'tramway.proxy.rlwy.net', port: 44057,
  user: 'root', password: process.env.DB_PASS, database: 'railway',
});

for (const issuerKey of ['angelus', 'angelus-alpha']) {
  const [res] = await conn.execute(
    `INSERT IGNORE INTO user_issuer_access (user_id, issuer_key, status, decided_at)
     SELECT id, ?, 'approved', NOW() FROM users WHERE role = 'user'`,
    [issuerKey]
  );
  console.log(issuerKey, '→ neue Freischaltungen:', res.affectedRows);
}

const [rows] = await conn.execute(
  `SELECT issuer_key, status, COUNT(*) as anzahl FROM user_issuer_access GROUP BY issuer_key, status`
);
console.table(rows);
await conn.end();
