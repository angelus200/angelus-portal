// E5: Mehrfach-Zeichner anlegen (1:n) — generisch, konfig-getrieben. Kunde (legacy_customers) +
// n Bonds (legacy_bonds) + payment_history pro Bond (legacy_bond_id). IDEMPOTENT (Kunde per email,
// Bond per contract_number; Payments delete+reinsert je Bond). Host-Guardrail HART auf acela.
// Saldo-Modell = dieselbe Engine wie Brendel (Vollzahler-Kontokorrent, refinancing_rate pro Bond).
//   railway run --service MySQL node scripts/insert-legacy-bonds.cjs
const mysql = require('mysql2/promise');

const planMonths = (s, e, amount, note) => {
  const out = []; let [y, m] = s.split('-').map(Number); const [ey, em] = e.split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) { out.push({ d: `${y}-${String(m).padStart(2, '0')}-15`, a: amount, note }); m++; if (m > 12) { m = 1; y++; } }
  return out;
};
const luecke = [['2023-11-15'], ['2023-12-15'], ['2024-01-15'], ['2024-02-15']].map(([d]) => ({ d, a: 2750, note: 'proforma (PNG-Ende bis Plan-Beginn)' }));

// ===================== KONFIG =====================
const CUSTOMER = {
  contractNumber: '138180625', // vestigial (NOT NULL), Lookup geht ueber Bond; droppt in E6
  firstName: 'Bernd Reiner', lastName: 'Kirsten', birthDate: '1953-12-01',
  email: 'bernd.r.kirsten@t-online.de', phone: '01712662846',
  street: 'Mergentheimer Str.', houseNumber: '11', postalCode: '70372', city: 'Stuttgart', country: 'Deutschland',
  iban: 'DE72600400710729116400', bic: null, accountHolder: 'Bernd Reiner Kirsten',
  capitalGainsTax: '25.00', solidaritySurcharge: '5.50', churchTax: '8.00', // KiSt Baden ev.
  status: 'active',
  notes: 'Steuer-ID 91652438303 · Steuernr 9519320505 · FA Stuttgart · verheiratet · evangelisch (KiSt Baden 8%) · Ausweis L86MFZ3H6 · Kombinierte Steuerbescheinigung: 2023 Brutto 47.061,67 (KeSt 11.534,72/SolZ 634,41/KiSt 922,78); 2025 Brutto 81.500,00 (KeSt 19.975,49/SolZ 1.098,65/KiSt 1.598,04)',
};

const BONDS = [
  {
    contractNumber: '138180625', bondNumber: '60-2023',
    contractDate: '2025-06-19', valueDate: '2025-06-26', investmentAmount: '200000.00',
    annualInterestRate: '18.00', refinancingRate: '20.00', // Coupon 18 + 2
    annualInterestDate: '2025-06-26', monthlyPaymentDay: 15, zinsbasis: '30E/360', status: 'active',
    einzahlungen: [{ d: '2025-06-26', a: 200000 }],
    abschlaege: [{ d: '2025-07-15', a: 500, note: 'Rumpf' }, ...planMonths('2025-08', '2026-05', 3000, 'Auszahlungsplan')],
  },
  {
    contractNumber: '113281022', bondNumber: '06-2022',
    contractDate: '2022-11-03', valueDate: '2022-11-03', investmentAmount: '100000.00',
    annualInterestRate: '33.00', refinancingRate: '35.00', // Coupon 33 + 2
    annualInterestDate: '2022-10-01', monthlyPaymentDay: 15, zinsbasis: '30E/360', status: 'active',
    einzahlungen: [{ d: '2022-11-03', a: 50000 }, { d: '2022-12-13', a: 50000 }],
    abschlaege: [
      { d: '2022-12-14', a: 1238.33 }, { d: '2023-01-13', a: 2200 }, { d: '2023-02-15', a: 2750 },
      { d: '2023-03-15', a: 2750 }, { d: '2023-04-17', a: 2750 }, { d: '2023-05-15', a: 2750 },
      { d: '2023-06-19', a: 2750 }, { d: '2023-07-17', a: 2750 }, { d: '2023-08-16', a: 2750 },
      { d: '2023-09-15', a: 2750 }, { d: '2023-09-15', a: 458.33, note: 'Korrektur' }, { d: '2023-10-16', a: 2750 },
      ...luecke, ...planMonths('2024-03', '2026-03', 2750, 'Auszahlungsplan'),
    ],
  },
  {
    contractNumber: '125280223', bondNumber: '06-2022',
    contractDate: '2023-02-28', valueDate: '2023-02-28', investmentAmount: '100000.00',
    annualInterestRate: '33.00', refinancingRate: '35.00', // Coupon 33 + 2
    annualInterestDate: '2023-10-01', monthlyPaymentDay: 15, zinsbasis: '30E/360', status: 'active',
    einzahlungen: [{ d: '2023-02-28', a: 50000 }, { d: '2023-07-18', a: 20000 }, { d: '2023-12-08', a: 20000 }, { d: '2024-01-12', a: 10000 }],
    abschlaege: [
      { d: '2023-04-20', a: 3666.67 }, { d: '2023-05-15', a: 1375 }, { d: '2023-07-17', a: 458.33 },
      { d: '2023-08-16', a: 1375 }, { d: '2023-10-16', a: 2511.67 },
      ...luecke, ...planMonths('2024-03', '2026-05', 2750, 'Auszahlungsplan'),
    ],
  },
];
// =================================================

function pickUrl() {
  const c = Object.entries(process.env).filter(([, v]) => typeof v === 'string' && v.startsWith('mysql://'));
  const pub = c.find(([, v]) => !/railway\.internal/.test(v));
  return pub ? pub[1] : process.env.DATABASE_URL;
}

const BOND_COLS = ['contract_number', 'bond_number', 'contract_date', 'value_date', 'investment_amount',
  'annual_interest_rate', 'refinancing_rate', 'annual_interest_date', 'monthly_payment_day', 'zinsbasis', 'status'];

(async () => {
  const url = pickUrl();
  const host = (url.match(/@([^:/]+)/) || [])[1] || '?';
  console.log(`[Guardrail] Ziel-Host=${host}`);
  if (!host.includes('acela')) { console.error('ABBRUCH: nicht acela (KG).'); process.exit(2); }

  const conn = await mysql.createConnection({ uri: url });
  let committed = false;
  try {
    await conn.beginTransaction();

    // 1) Kunde (Upsert per email)
    const [ex] = await conn.query('SELECT id FROM legacy_customers WHERE email=?', [CUSTOMER.email]);
    let customerId;
    if (ex.length) {
      customerId = ex[0].id; console.log(`  = Kunde ${customerId} (existiert)`);
    } else {
      const [r] = await conn.query(
        `INSERT INTO legacy_customers (contract_number, first_name, last_name, birth_date, email, phone, street, house_number, postal_code, city, country, iban, bic, account_holder, capital_gains_tax, solidarity_surcharge, church_tax, status, notes)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [CUSTOMER.contractNumber, CUSTOMER.firstName, CUSTOMER.lastName, CUSTOMER.birthDate, CUSTOMER.email, CUSTOMER.phone,
         CUSTOMER.street, CUSTOMER.houseNumber, CUSTOMER.postalCode, CUSTOMER.city, CUSTOMER.country, CUSTOMER.iban, CUSTOMER.bic,
         CUSTOMER.accountHolder, CUSTOMER.capitalGainsTax, CUSTOMER.solidaritySurcharge, CUSTOMER.churchTax, CUSTOMER.status, CUSTOMER.notes]);
      customerId = r.insertId; console.log(`  + Kunde ${customerId} angelegt (${CUSTOMER.firstName} ${CUSTOMER.lastName})`);
    }

    // 2) Bonds (Upsert per contract_number) + 3) Payments (delete+reinsert je Bond)
    for (const b of BONDS) {
      const [bx] = await conn.query('SELECT id FROM legacy_bonds WHERE contract_number=?', [b.contractNumber]);
      let bondId;
      const vals = BOND_COLS.map((c) => {
        const map = { contract_number: b.contractNumber, bond_number: b.bondNumber, contract_date: b.contractDate, value_date: b.valueDate, investment_amount: b.investmentAmount, annual_interest_rate: b.annualInterestRate, refinancing_rate: b.refinancingRate, annual_interest_date: b.annualInterestDate, monthly_payment_day: b.monthlyPaymentDay, zinsbasis: b.zinsbasis, status: b.status };
        return map[c];
      });
      if (bx.length) {
        bondId = bx[0].id;
        await conn.query(`UPDATE legacy_bonds SET ${BOND_COLS.map((c) => `${c}=?`).join(',')}, legacy_customer_id=? WHERE id=?`, [...vals, customerId, bondId]);
        console.log(`  = Bond ${bondId} (${b.contractNumber}) aktualisiert`);
      } else {
        const [r] = await conn.query(`INSERT INTO legacy_bonds (legacy_customer_id, ${BOND_COLS.join(',')}) VALUES (?,${BOND_COLS.map(() => '?').join(',')})`, [customerId, ...vals]);
        bondId = r.insertId; console.log(`  + Bond ${bondId} (${b.contractNumber}, refi ${b.refinancingRate}) angelegt`);
      }
      // Payments dieses Bonds neu (idempotent)
      await conn.query("DELETE FROM legacy_customer_payment_history WHERE legacy_bond_id=? AND payment_type IN ('initial_investment','interest_payment')", [bondId]);
      for (const e of b.einzahlungen)
        await conn.query('INSERT INTO legacy_customer_payment_history (legacy_customer_id, legacy_bond_id, payment_type, payment_date, amount, status) VALUES (?,?,?,?,?,?)', [customerId, bondId, 'initial_investment', e.d, e.a.toFixed(2), 'confirmed']);
      for (const a of b.abschlaege)
        await conn.query('INSERT INTO legacy_customer_payment_history (legacy_customer_id, legacy_bond_id, payment_type, payment_date, amount, status, notes) VALUES (?,?,?,?,?,?,?)', [customerId, bondId, 'interest_payment', a.d, a.a.toFixed(2), 'confirmed', a.note ?? null]);
      const [cnt] = await conn.query('SELECT COUNT(*) n FROM legacy_customer_payment_history WHERE legacy_bond_id=?', [bondId]);
      console.log(`    payment_history: ${cnt[0].n} (${b.einzahlungen.length} Einz + ${b.abschlaege.length} Abschl)`);
    }

    await conn.commit(); committed = true;
    console.log('OK: Kirsten + 3 Bonds angelegt (acela).');
  } catch (e) {
    if (!committed) { try { await conn.rollback(); } catch {} }
    console.error('ROLLBACK / FEHLER:', e.message); process.exitCode = 1;
  } finally { await conn.end(); }
})();
