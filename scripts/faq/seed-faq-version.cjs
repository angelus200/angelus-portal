// FAQ-Gate Seed: faq_versions-Datensatz aus der Volltext-Datei. ABBRUCH-GATE: Datei lesen -> SHA-256
// -> wenn ≠ Soll-Hash, FEHLER vor jedem DB-Write (nie ein falscher Hash geseedet). IDEMPOTENT (Version
// existiert -> kein Überschreiben). Content-only -> NUR acela (KG); MyBonds zeigt das Gate nie.
// Roundtrip-Verify: re-hash des gespeicherten Contents == Soll (fängt utf8mb4-/Encoding-Drift).
//   railway run --service MySQL node scripts/faq/seed-faq-version.cjs   (acela)
const mysql = require('mysql2/promise');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const VERSION = '2026-06';
const EXPECTED_HASH = '633f35953bfe79f9cd919aab905b93d0b2deccf30a1ff4199fcd6b554a753b66';
const FILE = path.join(__dirname, `Angelus_FAQ_${VERSION}.md`);

function pickUrl() {
  const c = Object.entries(process.env).filter(([, v]) => typeof v === 'string' && v.startsWith('mysql://'));
  const pub = c.find(([, v]) => !/railway\.internal/.test(v));
  return pub ? pub[1] : process.env.DATABASE_URL;
}

(async () => {
  // 1) Datei lesen + Hash-Gate VOR jedem DB-Kontakt.
  const buf = fs.readFileSync(FILE);
  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  console.log(`Datei ${path.basename(FILE)}: ${buf.length} Bytes, SHA-256 ${hash}`);
  if (hash !== EXPECTED_HASH) {
    console.error(`ABBRUCH: Hash ≠ Soll (${EXPECTED_HASH}). Kein DB-Write.`); process.exit(3);
  }
  const content = buf.toString('utf8');

  const url = pickUrl();
  const host = (url.match(/@([^:/]+)/) || [])[1] || '?';
  console.log(`[Guardrail] Ziel-Host=${host}`);
  if (!host.includes('acela')) { console.error('ABBRUCH: nicht acela (FAQ-Content nur KG).'); process.exit(2); }

  const conn = await mysql.createConnection({ uri: url });
  try {
    const [ex] = await conn.query('SELECT id, content_hash FROM faq_versions WHERE faq_version = ?', [VERSION]);
    if (ex.length) {
      console.log(`= Version ${VERSION} existiert bereits (hash ${ex[0].content_hash}) — kein Überschreiben (append-only).`);
    } else {
      await conn.query(
        'INSERT INTO faq_versions (faq_version, content, content_hash, published_at) VALUES (?, ?, ?, NOW())',
        [VERSION, content, hash],
      );
      console.log(`+ Version ${VERSION} geseedet (${buf.length} Bytes, hash ${hash}).`);
    }
    // Roundtrip-Verify: gespeicherten Content erneut hashen -> muss dem Soll entsprechen (utf8mb4-Beweis).
    const [chk] = await conn.query('SELECT content, content_hash FROM faq_versions WHERE faq_version = ?', [VERSION]);
    const reHash = crypto.createHash('sha256').update(Buffer.from(chk[0].content, 'utf8')).digest('hex');
    console.log(`Roundtrip: gespeicherter Content re-hash ${reHash} ${reHash === EXPECTED_HASH ? '== Soll ✓' : '≠ Soll ✗ (Encoding-Drift!)'}`);
    console.log(`Gespeicherter content_hash: ${chk[0].content_hash} ${chk[0].content_hash === EXPECTED_HASH ? '✓' : '✗'}`);
    if (reHash !== EXPECTED_HASH) process.exitCode = 4;
    console.log('OK.');
  } catch (e) {
    console.error('FEHLER:', e.message); process.exitCode = 1;
  } finally { await conn.end(); }
})();
