// scripts/seed-issuers.mjs
// Einmaliger Seed: bestehende Brands als issuers-Datensätze anlegen (idempotent)
// Aufruf:  $env:DB_PASS="..." ; node scripts/seed-issuers.mjs
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host: 'tramway.proxy.rlwy.net',
  port: 44057,
  user: 'root',
  password: process.env.DB_PASS,
  database: 'railway',
});

const seed = [
  {
    issuerKey: 'angelus',
    name: 'Angelus Managementberatungs und Service KG',
    shortName: 'Angelus',
    country: 'Deutschland',
    logoUrl: '/logo.png',
    badgeColor: 'yellow',
    language: 'de',
    active: 1, // bleibt aktiv für Bestands-Inhaber; neue KG-Anleihen werden nicht mehr angelegt
  },
  {
    issuerKey: 'angelus-alpha',
    name: 'Angelus Alpha Beteiligungen GmbH',
    shortName: 'Angelus Alpha',
    country: 'Deutschland',
    logoUrl: '/logo-alpha.png',
    badgeColor: 'purple',
    language: 'de',
    active: 1,
  },
];

for (const s of seed) {
  await conn.execute(
    `INSERT INTO issuers (issuer_key, name, short_name, country, logo_url, badge_color, language, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name)`,
    [s.issuerKey, s.name, s.shortName, s.country, s.logoUrl, s.badgeColor, s.language, s.active]
  );
  console.log('Seeded:', s.issuerKey);
}

const [rows] = await conn.execute('SELECT issuer_key, name, badge_color, language, active FROM issuers');
console.table(rows);
await conn.end();
