// Verbreitert legacy_customer_documents.file_type 50 -> 255 (Office-MIME-Typen sind >50 Zeichen,
// z.B. .docx = 71). IDEMPOTENT (nur MODIFY wenn aktuell <255). Host-Guardrail. BEIDE DBs separat.
//   railway run --service MySQL node scripts/migrate-widen-legacy-document-filetype.cjs   (acela)
//   node scripts/migrate-widen-legacy-document-filetype.cjs "mysql://<tramway>"           (tramway)
const mysql=require('mysql2/promise');
function pickUrl(){if(process.argv[2]&&process.argv[2].startsWith('mysql://'))return process.argv[2];const c=Object.entries(process.env).filter(([,v])=>typeof v==='string'&&v.startsWith('mysql://'));const p=c.find(([,v])=>!/railway\.internal/.test(v));return p?p[1]:process.env.DATABASE_URL;}
(async()=>{
  const url=pickUrl(); const host=(url.match(/@([^:/]+)/)||[])[1]||'?';
  console.log(`[Guardrail] Ziel-Host=${host}`);
  const conn=await mysql.createConnection({uri:url});
  try{
    const [r]=await conn.query("SELECT CHARACTER_MAXIMUM_LENGTH len FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='legacy_customer_documents' AND COLUMN_NAME='file_type'");
    const cur=r[0]?.len;
    if(cur>=255){console.log(`  = file_type schon VARCHAR(${cur}), skip`);}
    else{await conn.query("ALTER TABLE legacy_customer_documents MODIFY COLUMN file_type VARCHAR(255) NULL");console.log(`  ~ file_type ${cur} -> 255`);}
    console.log(`OK auf ${host}`);
  } finally { await conn.end(); }
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
