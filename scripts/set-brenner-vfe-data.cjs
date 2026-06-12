// Brenner VFE-Schlussabrechnungs-Daten setzen (acela/KG). Idempotent, Host-Guardrail HART auf acela.
// kuendigungStatus='wirksam', Eingang 2026-06-09, vfe_satz 0.2000, schadensersatz_teilbetrag 10000,
// vergleichsfrist 2026-07-30. Aktiviert die VFE-Sicht (Fall 3) — Hauptsaldo 72.250.
const mysql = require('mysql2/promise');
function pickUrl(){const c=Object.entries(process.env).filter(([,v])=>typeof v==='string'&&v.startsWith('mysql://'));const p=c.find(([,v])=>!/railway\.internal/.test(v));return p?p[1]:process.env.DATABASE_URL;}
(async()=>{
  const url=pickUrl(); const host=(url.match(/@([^:/]+)/)||[])[1]||'?';
  console.log(`[Guardrail] Ziel-Host=${host}`);
  if(!host.includes('acela')){console.error('ABBRUCH: nicht acela');process.exit(2);}
  const conn=await mysql.createConnection({uri:url});
  try{
    const [u]=await conn.query("UPDATE legacy_customers SET kuendigung_status='wirksam', kuendigung_eingegangen_am='2026-06-09', vfe_satz='0.2000', schadensersatz_teilbetrag='10000.00', vergleichsfrist='2026-07-30' WHERE contract_number='110111122'");
    console.log('  update rows=', u.affectedRows);
    const [r]=await conn.query("SELECT kuendigung_status ks, DATE_FORMAT(kuendigung_eingegangen_am,'%Y-%m-%d') ke, vfe_satz, schadensersatz_teilbetrag st, DATE_FORMAT(vergleichsfrist,'%Y-%m-%d') vf FROM legacy_customers WHERE contract_number='110111122'");
    console.table(r);
    const x=r[0];
    const ok = x.ks==='wirksam' && x.ke==='2026-06-09' && Number(x.vfe_satz)===0.2 && Number(x.st)===10000 && x.vf==='2026-07-30';
    console.log(ok?'✓ Brenner VFE-Daten gesetzt':'✗ ABWEICHUNG');
    process.exit(ok?0:1);
  } finally { await conn.end(); }
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
