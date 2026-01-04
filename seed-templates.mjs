import { getDb } from './server/_core/db.js';
import { contractTemplates } from './contract-templates.ts';

async function seedTemplates() {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    console.log('✅ Datenbankverbindung hergestellt');
    
    for (const template of contractTemplates) {
      const result = await db.insert(contractTemplates).values({
        name: template.name,
        type: template.type,
        content: template.content,
        version: '1.0',
        validFrom: new Date(template.validFrom),
        isActive: true,
        createdBy: 1,
        updatedBy: 1,
      });
      
      console.log(`✅ Vorlage erstellt: ${template.name}`);
    }
    
    console.log('\n✅ Alle Vertragsvorlagen erfolgreich geladen!');
  } catch (error) {
    console.error('❌ Fehler:', error.message);
  }
}

seedTemplates();
