// BRENDEL-DUBLETTE (TEST) — erster Lauf des User-Mechanismus + vollständige Kopie für den E2E-Test.
// Kopiert legacy_customer 2 (+ Bond + payment_history) via INSERT…SELECT (TZ-sicher, dynamische
// Spaltenliste -> KEIN Engine-Feld verloren -> Saldo +313,50 muss reproduzieren), legt den User an
// (Mechanismus aus create-legacy-users.cjs) und erzeugt einen gültigen Invitation-Direktlink.
// IDEMPOTENT (Dublette per E-Mail erkannt, gültige Invitation wiederverwendet). acela, Guardrail, Tx.
//   railway run --service MySQL node scripts/legacy/create-brendel-dublette.cjs
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const { ensureUserForLegacyCustomer, pickUrl } = require('./create-legacy-users.cjs');

const SRC_CUSTOMER = 2;
const DUB = {
  first_name: 'Siglinde Brigitte',
  last_name: 'Brendel (TEST-Dublette)',
  email: 'brendel-e2e@angelus.group',
  contract_number: 'E2E-136171024',
};

async function columnsExceptId(conn, table) {
  const [r] = await conn.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name <> 'id' ORDER BY ordinal_position",
    [table],
  );
  return r.map((x) => x.COLUMN_NAME || x.column_name);
}

// Kopiert Zeile(n) via INSERT … SELECT komplett serverseitig (kein JS-Date-Roundtrip). Overrides
// ersetzen einzelne Spalten durch Parameter; alle anderen werden 1:1 aus der Quelle übernommen.
async function copyRows(conn, table, whereClause, whereParams, overrides) {
  const cols = await columnsExceptId(conn, table);
  const selectExprs = cols.map((c) => (Object.prototype.hasOwnProperty.call(overrides, c) ? '?' : `\`${c}\``));
  const overrideParams = cols.filter((c) => Object.prototype.hasOwnProperty.call(overrides, c)).map((c) => overrides[c]);
  const sql = `INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(',')}) SELECT ${selectExprs.join(',')} FROM \`${table}\` WHERE ${whereClause}`;
  const [res] = await conn.query(sql, [...overrideParams, ...whereParams]);
  return res;
}

(async () => {
  const url = pickUrl();
  const host = (url.match(/@([^:/]+)/) || [])[1] || '?';
  console.log(`[Guardrail] Ziel-Host=${host}`);
  if (!host.includes('acela')) { console.error('ABBRUCH: nicht acela (KG).'); process.exit(2); }

  const conn = await mysql.createConnection({ uri: url });
  try {
    await conn.beginTransaction();

    // 1) Dublette-Kunde (idempotent per E-Mail)
    let [ex] = await conn.query('SELECT id FROM legacy_customers WHERE email = ?', [DUB.email]);
    let newCustId;
    if (ex.length) {
      newCustId = ex[0].id;
      console.log(`= Dublette existiert bereits (legacy_customer ${newCustId}) — kein Re-Copy.`);
    } else {
      await copyRows(conn, 'legacy_customers', 'id = ?', [SRC_CUSTOMER],
        { first_name: DUB.first_name, last_name: DUB.last_name, email: DUB.email, contract_number: DUB.contract_number, user_id: null });
      [ex] = await conn.query('SELECT id FROM legacy_customers WHERE email = ?', [DUB.email]);
      newCustId = ex[0].id;
      console.log(`+ legacy_customer ${newCustId} (Kopie von ${SRC_CUSTOMER})`);

      const [srcBond] = await conn.query('SELECT id FROM legacy_bonds WHERE legacy_customer_id = ?', [SRC_CUSTOMER]);
      await copyRows(conn, 'legacy_bonds', 'id = ?', [srcBond[0].id],
        { legacy_customer_id: newCustId, contract_number: DUB.contract_number });
      const [newBond] = await conn.query('SELECT id FROM legacy_bonds WHERE legacy_customer_id = ?', [newCustId]);
      const newBondId = newBond[0].id;
      console.log(`+ legacy_bond ${newBondId} (Kopie von ${srcBond[0].id})`);

      const r = await copyRows(conn, 'legacy_customer_payment_history', 'legacy_bond_id = ?', [srcBond[0].id],
        { legacy_customer_id: newCustId, legacy_bond_id: newBondId });
      console.log(`+ payment_history: ${r.affectedRows} Zeilen kopiert`);
    }

    // 2) User anlegen + verknüpfen (generischer Mechanismus)
    const u = await ensureUserForLegacyCustomer(conn, newCustId);
    console.log('User:', u);

    // 3) Invitation-Direktlink (idempotent: gültige pending-Invitation wiederverwenden)
    const [adm] = await conn.query("SELECT id FROM users WHERE role IN ('admin','superadmin') ORDER BY id LIMIT 1");
    const adminId = adm.length ? adm[0].id : null;
    let token;
    let expiresAt;
    const [pend] = await conn.query(
      "SELECT token, expires_at FROM legacy_customer_invitations WHERE legacy_customer_id = ? AND status = 'pending' AND used_at IS NULL AND expires_at > NOW() ORDER BY id DESC LIMIT 1",
      [newCustId],
    );
    if (pend.length) {
      token = pend[0].token; expiresAt = pend[0].expires_at;
      console.log('= gültige Invitation existiert — wiederverwendet.');
    } else {
      token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await conn.query(
        "INSERT INTO legacy_customer_invitations (legacy_customer_id, token, token_hash, email, status, expires_at, sent_by_admin_id) VALUES (?, ?, ?, ?, 'pending', DATE_ADD(NOW(), INTERVAL 7 DAY), ?)",
        [newCustId, token, tokenHash, DUB.email, adminId],
      );
      const [e] = await conn.query('SELECT expires_at FROM legacy_customer_invitations WHERE token = ?', [token]);
      expiresAt = e[0].expires_at;
      console.log('+ Invitation erstellt.');
    }

    await conn.commit();
    console.log('\n=== ERGEBNIS ===');
    console.log(`legacy_customer_id: ${newCustId}  |  user_id: ${u.userId}`);
    console.log(`Link: https://portal.angelus.capital/register?invitation=${token}`);
    console.log(`Ablauf: ${expiresAt}`);
    console.log('Erwarteter Saldo (Verify separat): +313,50');
  } catch (e) {
    try { await conn.rollback(); } catch {}
    console.error('FEHLER (rollback):', e.message); process.exitCode = 1;
  } finally { await conn.end(); }
})();
