// P5: Bestandszeichnerin Brigitte Brendel (VOLLZAHLERIN) anlegen — KG/acela.
// Idempotent (Upsert per contract_number / users.email; payment_history delete+reinsert
// NUR der eigenen Zeilen). Eine Transaktion. Host-Guardrail HART auf acela (Abbruch sonst).
// KEIN drizzle-kit push. Passwort wird NUR nach Downloads geschrieben, nie nach stdout.
//
// Nutzung:  railway run --service MySQL node scripts/insert-brendel-vollzahler.cjs
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

function pickUrl() {
  if (process.argv[2] && process.argv[2].startsWith('mysql://')) return process.argv[2];
  const c = Object.entries(process.env).filter(([, v]) => typeof v === 'string' && v.startsWith('mysql://'));
  const pub = c.find(([, v]) => !/railway\.internal/.test(v));
  return pub ? pub[1] : process.env.DATABASE_URL;
}

const TEST_EMAIL = 'brendel-test@angelus.group';
const TEST_NAME = 'Siglinde Brigitte Brendel (TEST)';

// legacy_customers Feldsatz (snake_case = DB-Spalten)
const LC = {
  contract_number: '136171024',
  first_name: 'Siglinde Brigitte', last_name: 'Brendel',
  birth_date: '1960-06-28', email: 'brendelbrigitte33@gmail.com', phone: '0171-2333961',
  street: 'Gartenweg', house_number: '2', postal_code: '91257', city: 'Pegnitz', country: 'Deutschland',
  iban: 'DE57773400760380692400', bic: null, account_holder: 'Siglinde Brigitte Brendel',
  bond_id: null, bond_number: '60-2023',
  contract_date: '2024-10-17', value_date: '2024-10-18', investment_amount: '100000.00',
  share_count: 100, share_value: '1000.00',
  annual_interest_rate: '18.00', interest_payment_frequency: 'monthly',
  annual_interest_date: '2024-06-01', // nur MM-DD (06-01) wird von der Engine gelesen
  monthly_payment_day: 15,
  maturity_date: '2026-05-31', term_months: null,
  capital_gains_tax: '25.00', solidarity_surcharge: '5.50', church_tax: '8.00', // 8% Bayern
  refinancing_rate: null, // KEINE offene Einlage -> Vollzahler-Pfad
  risk_classification: null, zinsbasis: '30E/360',
  kuendigung_eingegangen_am: '2026-05-19', kuendigung_status: 'zurueckgewiesen',
  naechster_kuendigungstermin: '2027-05-31',
  status: 'active',
};

// 19 Abschläge à 1.500 brutto, 15. des Monats, bis Mai 2026; danach KEINE (Kündigung, §4(3))
function interestDates() {
  const d = ['2024-11-15', '2024-12-15']; // proforma (aus Muster, nicht Steuerbescheinigung 2024)
  for (let m = 1; m <= 12; m++) d.push(`2025-${String(m).padStart(2, '0')}-15`);
  for (let m = 1; m <= 5; m++) d.push(`2026-${String(m).padStart(2, '0')}-15`);
  return d;
}

(async () => {
  const url = pickUrl();
  if (!url) { console.error('FEHLER: keine mysql://-URL'); process.exit(1); }
  const host = (url.match(/@([^:/]+)/) || [])[1] || '?';
  const dbName = (url.match(/\/([^/?]+)(\?|$)/) || [])[1] || '?';
  console.log(`[Guardrail] Ziel-Host=${host}  DB=${dbName}`);
  if (!host.includes('acela')) { console.error('ABBRUCH: Ziel ist nicht acela (KG).'); process.exit(2); }

  const password = crypto.randomBytes(15).toString('base64').replace(/[+/=]/g, '').slice(0, 18) + 'A7!';
  const passwordHash = await bcrypt.hash(password, 12);

  const conn = await mysql.createConnection({ uri: url });
  let committed = false;
  try {
    await conn.beginTransaction();

    // 1) Test-Login-User (Upsert per email)
    const [ur] = await conn.query('SELECT id FROM users WHERE email=?', [TEST_EMAIL]);
    let userId;
    if (ur.length) {
      userId = ur[0].id;
      await conn.query('UPDATE users SET passwordHash=?, emailVerified=1, name=?, role=? WHERE id=?',
        [passwordHash, TEST_NAME, 'user', userId]);
      console.log(`  = users: bestehender Test-User id=${userId} (Passwort/Flags aktualisiert)`);
    } else {
      const [r] = await conn.query(
        'INSERT INTO users (email, passwordHash, emailVerified, role, name) VALUES (?,?,?,?,?)',
        [TEST_EMAIL, passwordHash, 1, 'user', TEST_NAME]);
      userId = r.insertId;
      console.log(`  + users: Test-User angelegt id=${userId}`);
    }

    // 2) legacy_customers (Upsert per contract_number), user_id verdrahtet
    const lc = { ...LC, user_id: userId };
    const cols = Object.keys(lc);
    const vals = Object.values(lc);
    const [ex] = await conn.query('SELECT id FROM legacy_customers WHERE contract_number=?', [lc.contract_number]);
    let legacyId;
    if (ex.length) {
      legacyId = ex[0].id;
      const setSql = cols.map((c) => `\`${c}\`=?`).join(', ');
      await conn.query(`UPDATE legacy_customers SET ${setSql} WHERE id=?`, [...vals, legacyId]);
      console.log(`  = legacy_customers: bestehend id=${legacyId} aktualisiert`);
    } else {
      const ph = cols.map(() => '?').join(',');
      const [r] = await conn.query(
        `INSERT INTO legacy_customers (${cols.map((c) => `\`${c}\``).join(',')}) VALUES (${ph})`, vals);
      legacyId = r.insertId;
      console.log(`  + legacy_customers: angelegt id=${legacyId}`);
    }

    // 3) payment_history — eigene Zeilen löschen + neu (idempotent)
    await conn.query(
      'DELETE FROM legacy_customer_payment_history WHERE legacy_customer_id=? AND payment_type IN (?,?)',
      [legacyId, 'initial_investment', 'interest_payment']);
    await conn.query(
      'INSERT INTO legacy_customer_payment_history (legacy_customer_id,payment_type,payment_date,amount,status,notes) VALUES (?,?,?,?,?,?)',
      [legacyId, 'initial_investment', '2024-10-18', '100000.00', 'confirmed', 'Volleinzahlung gezeichnete Einlage (offen -> 0)']);
    const dates = interestDates();
    for (const d of dates) {
      const proforma = d.startsWith('2024');
      await conn.query(
        'INSERT INTO legacy_customer_payment_history (legacy_customer_id,payment_type,payment_date,amount,status,notes) VALUES (?,?,?,?,?,?)',
        [legacyId, 'interest_payment', d, '1500.00', 'confirmed',
          proforma ? 'proforma — aus Muster abgeleitet, NICHT aus Steuerbescheinigung 2024 belegt; ersetzbar' : null]);
    }

    // 4) HARTE ASSERTIONS (sonst Rollback)
    const [s25] = await conn.query(
      "SELECT COALESCE(SUM(amount),0) v FROM legacy_customer_payment_history WHERE legacy_customer_id=? AND payment_type='interest_payment' AND YEAR(payment_date)=2025", [legacyId]);
    const [sa] = await conn.query(
      "SELECT COALESCE(SUM(amount),0) v, COUNT(*) n FROM legacy_customer_payment_history WHERE legacy_customer_id=? AND payment_type='interest_payment'", [legacyId]);
    const [sf] = await conn.query(
      "SELECT COUNT(*) n FROM legacy_customer_payment_history WHERE legacy_customer_id=? AND payment_type='interest_payment' AND payment_date>='2026-06-01'", [legacyId]);
    const sum2025 = Number(s25[0].v), sumAll = Number(sa[0].v), cntAll = Number(sa[0].n), future = Number(sf[0].n);
    console.log(`  Assertions: Σ2025=${sum2025}  ΣAlle=${sumAll}  Anzahl=${cntAll}  >=2026-06-01:${future}`);
    if (sum2025 !== 18000) throw new Error(`2025-Summe ${sum2025} != 18000`);
    if (sumAll !== 28500) throw new Error(`Gesamtsumme ${sumAll} != 28500`);
    if (cntAll !== 19) throw new Error(`Abschlag-Anzahl ${cntAll} != 19`);
    if (future !== 0) throw new Error(`${future} Abschläge >= 2026-06-01 (verboten)`);

    await conn.commit();
    committed = true;
    console.log(`OK: Brendel angelegt/aktualisiert (legacy_customer id=${legacyId}, user id=${userId}).`);

    // 5) Passwort NUR nach Downloads
    const outFile = path.join(os.homedir(), 'Downloads', 'brendel-test-login.txt');
    fs.writeFileSync(outFile,
      `Angelus KG-Portal (portal.angelus.capital) — Test-Login Brendel (Vollzahlerin)\n` +
      `E-Mail:   ${TEST_EMAIL}\nPasswort: ${password}\n` +
      `legacy_customer id: ${legacyId}\nErstellt: P5 Insert-Skript\n`,
      { encoding: 'utf8' });
    console.log(`  Passwort geschrieben nach: ${outFile} (nicht im Output)`);
  } catch (e) {
    if (!committed) { try { await conn.rollback(); } catch {} }
    console.error('ROLLBACK / FEHLER:', e.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
})();
