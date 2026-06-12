// P7-Datenkorrektur Brendel (KG/acela). Idempotent, Host-Guardrail HART auf acela.
//  1. Erster interest_payment (2024-11-15) -> 600,00 (anteiliger Oktober, echte Steuertabelle,
//     ersetzt P5-Platzhalter 1.500). Σ aller Abschläge danach = 27.600.
//  2. refinancingRate -> 18.00 (steuert bei Brendel den VORFINANZIERUNGSSATZ; offen=0 -> NIE
//     Negativzins/kontinuierliche Engine; Weiche haengt an offen, nicht am Satz).
// Assertions (sonst Rollback): erster=600, Σ interest=27.600, refinancingRate=18.
//
// Nutzung: railway run --service MySQL node scripts/fix-brendel-p7-data.cjs
const mysql = require('mysql2/promise');

const CONTRACT = '136171024';
const FIRST_DATE = '2024-11-15';

function pickUrl() {
  const c = Object.entries(process.env).filter(([, v]) => typeof v === 'string' && v.startsWith('mysql://'));
  const pub = c.find(([, v]) => !/railway\.internal/.test(v));
  return pub ? pub[1] : process.env.DATABASE_URL;
}

(async () => {
  const url = pickUrl();
  if (!url) { console.error('FEHLER: keine mysql://-URL'); process.exit(1); }
  const host = (url.match(/@([^:/]+)/) || [])[1] || '?';
  console.log(`[Guardrail] Ziel-Host=${host}`);
  if (!host.includes('acela')) { console.error('ABBRUCH: Ziel ist nicht acela (KG).'); process.exit(2); }

  const conn = await mysql.createConnection({ uri: url });
  let committed = false;
  try {
    await conn.beginTransaction();
    const [lc] = await conn.query('SELECT id FROM legacy_customers WHERE contract_number=?', [CONTRACT]);
    if (!lc.length) throw new Error(`legacy_customer ${CONTRACT} nicht gefunden`);
    const id = lc[0].id;

    const [u1] = await conn.query(
      "UPDATE legacy_customer_payment_history SET amount='600.00', notes='Anteiliger Oktober (Wertstellung 18.10.), echte Steuertabelle START — ersetzt Platzhalter' WHERE legacy_customer_id=? AND payment_type='interest_payment' AND payment_date=?",
      [id, FIRST_DATE]);
    console.log(`  erster Abschlag (${FIRST_DATE}) -> 600,00 (rows=${u1.affectedRows})`);

    const [u2] = await conn.query("UPDATE legacy_customers SET refinancing_rate='18.00' WHERE id=?", [id]);
    console.log(`  refinancing_rate -> 18.00 (rows=${u2.affectedRows})`);

    // Assertions
    const [first] = await conn.query(
      "SELECT amount FROM legacy_customer_payment_history WHERE legacy_customer_id=? AND payment_type='interest_payment' AND payment_date=?", [id, FIRST_DATE]);
    const [sum] = await conn.query(
      "SELECT COALESCE(SUM(amount),0) v, COUNT(*) n FROM legacy_customer_payment_history WHERE legacy_customer_id=? AND payment_type='interest_payment'", [id]);
    const [rate] = await conn.query('SELECT refinancing_rate r FROM legacy_customers WHERE id=?', [id]);
    const firstAmt = Number(first[0].amount), sumAmt = Number(sum[0].v), cnt = Number(sum[0].n), refi = Number(rate[0].r);
    console.log(`  Assertions: erster=${firstAmt}  Σ=${sumAmt}  Anzahl=${cnt}  refinancingRate=${refi}`);
    if (firstAmt !== 600) throw new Error(`erster Abschlag ${firstAmt} != 600`);
    if (sumAmt !== 27600) throw new Error(`Σ ${sumAmt} != 27600`);
    if (cnt !== 19) throw new Error(`Anzahl ${cnt} != 19`);
    if (refi !== 18) throw new Error(`refinancingRate ${refi} != 18`);

    await conn.commit();
    committed = true;
    console.log(`OK: P7-Datenkorrektur auf legacy_customer id=${id} (acela).`);
  } catch (e) {
    if (!committed) { try { await conn.rollback(); } catch {} }
    console.error('ROLLBACK / FEHLER:', e.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
})();
