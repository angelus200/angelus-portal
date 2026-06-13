// SCHRITT 3 — generischer User-Anlage-Mechanismus für Bestandszeichner (acela, idempotent).
// ensureUserForLegacyCustomer(conn, customerId): legt für einen legacy_customer OHNE user_id einen
// User an (role 'user', emailVerified=0, KEIN Passwort -> der Invitation-Link setzt es via
// registerWithLegacyInvitation "existing user ohne Passwort -> setUserPassword") und setzt
// legacy_customers.user_id. IDEMPOTENT:
//   - Kunde hat schon user_id        -> skip (already-linked)
//   - User mit der E-Mail existiert   -> nur verknüpfen, KEIN Doppel-User (linked-existing-user)
//   - sonst                           -> User anlegen + verknüpfen (created-and-linked)
// Wiederverwendbar für Kirsten + die ~14 echten Zeichner: CUSTOMER_IDS unten eintragen + direkt
// ausführen, ODER ensureUserForLegacyCustomer aus einem anderen Skript requiren (Dublette nutzt das).
const mysql = require('mysql2/promise');

function pickUrl() {
  const c = Object.entries(process.env).filter(([, v]) => typeof v === 'string' && v.startsWith('mysql://'));
  const pub = c.find(([, v]) => !/railway\.internal/.test(v));
  return pub ? pub[1] : process.env.DATABASE_URL;
}

async function ensureUserForLegacyCustomer(conn, customerId) {
  const [cr] = await conn.query('SELECT id, user_id, email, first_name, last_name FROM legacy_customers WHERE id = ?', [customerId]);
  if (!cr.length) return { customerId, status: 'not-found' };
  const c = cr[0];
  if (c.user_id) return { customerId, userId: c.user_id, status: 'already-linked' };
  if (!c.email) return { customerId, status: 'no-email (kann nicht verknüpfen)' };
  const name = [c.first_name, c.last_name].filter(Boolean).join(' ');

  const [ur] = await conn.query('SELECT id FROM users WHERE email = ?', [c.email]);
  let userId;
  let status;
  if (ur.length) {
    userId = ur[0].id;
    status = 'linked-existing-user';
  } else {
    const [ins] = await conn.query(
      "INSERT INTO users (email, role, name, emailVerified) VALUES (?, 'user', ?, 0)",
      [c.email, name],
    );
    userId = ins.insertId;
    status = 'created-and-linked';
  }
  // user_id nur setzen, solange NULL (Schutz gegen versehentliches Überschreiben).
  await conn.query('UPDATE legacy_customers SET user_id = ? WHERE id = ? AND user_id IS NULL', [userId, customerId]);
  return { customerId, userId, status };
}

module.exports = { ensureUserForLegacyCustomer, pickUrl };

if (require.main === module) {
  // Hier die legacy_customer_ids eintragen (z.B. Kirsten=3, später die 14 echten Zeichner).
  const CUSTOMER_IDS = [];
  (async () => {
    const url = pickUrl();
    const host = (url.match(/@([^:/]+)/) || [])[1] || '?';
    console.log(`[Guardrail] Ziel-Host=${host}`);
    if (!host.includes('acela')) { console.error('ABBRUCH: nicht acela (KG).'); process.exit(2); }
    if (!CUSTOMER_IDS.length) { console.log('Keine CUSTOMER_IDS konfiguriert — nichts zu tun.'); process.exit(0); }
    const conn = await mysql.createConnection({ uri: url });
    try {
      for (const id of CUSTOMER_IDS) console.log(`Kunde ${id}:`, await ensureUserForLegacyCustomer(conn, id));
    } finally { await conn.end(); }
  })();
}
