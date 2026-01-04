#!/usr/bin/env node

/**
 * Seed-Script: Vertragsvorlagen für Angelus Unternehmensanleihen laden
 * Verwendung: node seed-templates.mjs
 * 
 * Lädt 4 professionelle Vertragsvorlagen in die Datenbank:
 * 1. Unternehmensanleihe-Vereinbarung
 * 2. Risikooffenlegung
 * 3. Allgemeine Geschäftsbedingungen (AGB)
 * 4. KYC/AML-Vereinbarung
 */

import { drizzle } from 'drizzle-orm/mysql2';
import { contractTemplates } from './drizzle/schema.js';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Datenbankverbindung
let db;

async function getDatabase() {
  if (!db) {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    db = drizzle(connection);
  }
  return db;
}

// Vertragsvorlagen aus Dateien laden
function loadTemplateContent(filename) {
  const filepath = path.join(__dirname, 'docs', filename);
  try {
    return fs.readFileSync(filepath, 'utf-8');
  } catch (error) {
    console.error(`❌ Fehler beim Laden von ${filename}:`, error.message);
    return '';
  }
}

const templates = [
  {
    name: 'Unternehmensanleihe-Vereinbarung',
    type: 'subscription_agreement',
    description: 'Rechtlich bindende Vereinbarung für die Zeichnung von Unternehmensanleihen der Angelus Management Beratungs und Service KG nach Schweizer Recht mit Schiedsgerichtsklausel',
    filename: '01-Unternehmensanleihe-Vereinbarung-FINAL.txt',
    isActive: true,
  },
  {
    name: 'Risikooffenlegung',
    type: 'risk_disclosure',
    description: 'Umfassende Risikowarnung für Investoren in Unternehmensanleihen mit Totalverlustrisiko-Warnung und Schiedsgerichtsklausel',
    filename: '02-Risikooffenlegung-FINAL.txt',
    isActive: true,
  },
  {
    name: 'Allgemeine Geschäftsbedingungen (AGB)',
    type: 'terms_conditions',
    description: 'Allgemeine Geschäftsbedingungen für Anleihen mit Rangrücktritt, Insolvenzvorbehalt und Schiedsgerichtsbarkeit',
    filename: '03-AGB-Anleihen-FINAL.txt',
    isActive: true,
  },
  {
    name: 'KYC/AML-Vereinbarung',
    type: 'kyc_aml',
    description: 'Know Your Customer und Anti-Geldwäsche Vereinbarung für Compliance mit deutschen und internationalen Gesetzen',
    filename: '04-KYC-AML-Vereinbarung-Anleihen-FINAL.txt',
    isActive: true,
  },
];

async function seedTemplates() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🌱 SEED-PROZESS: VERTRAGSVORLAGEN LADEN');
    console.log('='.repeat(80) + '\n');

    let loadedCount = 0;
    let failedCount = 0;

    for (const template of templates) {
      try {
        console.log(`📄 Lade Vorlage: ${template.name}`);
        
        // Inhalt aus Datei laden
        const content = loadTemplateContent(template.filename);
        
        if (!content) {
          console.log(`   ⚠️  WARNUNG: Datei ${template.filename} nicht gefunden oder leer`);
          failedCount++;
          continue;
        }

        // In Datenbank einfügen
        await db.insert(contractTemplates).values({
          name: template.name,
          type: template.type,
          description: template.description,
          content: content,
          isActive: template.isActive,
        });
        
        console.log(`   ✅ ${template.name} erfolgreich geladen`);
        console.log(`      - Typ: ${template.type}`);
        console.log(`      - Größe: ${(content.length / 1024).toFixed(2)} KB\n`);
        
        loadedCount++;
      } catch (error) {
        console.error(`   ❌ Fehler beim Laden von ${template.name}:`, error.message);
        failedCount++;
      }
    }

    console.log('='.repeat(80));
    console.log('ZUSAMMENFASSUNG');
    console.log('='.repeat(80) + '\n');

    console.log(`✅ Erfolgreich geladen: ${loadedCount}/4`);
    if (failedCount > 0) {
      console.log(`❌ Fehler: ${failedCount}/4`);
    }

    if (loadedCount === 4) {
      console.log('\n✅ ALLE 4 VERTRAGSVORLAGEN ERFOLGREICH GELADEN!\n');
      console.log('Geladene Vorlagen:');
      console.log('1. ✅ Unternehmensanleihe-Vereinbarung');
      console.log('2. ✅ Risikooffenlegung');
      console.log('3. ✅ Allgemeine Geschäftsbedingungen (AGB)');
      console.log('4. ✅ KYC/AML-Vereinbarung\n');
      
      console.log('NÄCHSTE SCHRITTE:');
      console.log('1. Öffnen Sie das Admin-Dashboard');
      console.log('2. Navigieren Sie zu "Produkte & Verträge"');
      console.log('3. Erstellen Sie den Test-Bond "Angelus Unternehmensanleihe 2026-2030"');
      console.log('4. Ordnen Sie alle 4 Vertragsvorlagen zum Bond zu');
      console.log('5. Testen Sie den Investor-Zeichnungsflow\n');
      
      console.log('='.repeat(80) + '\n');
      process.exit(0);
    } else {
      console.log('\n⚠️  EINIGE VORLAGEN KONNTEN NICHT GELADEN WERDEN\n');
      console.log('Bitte überprüfen Sie:');
      console.log('1. Datenbankverbindung (DATABASE_URL)')
      console.log('2. Dateienpfade in /docs/ Verzeichnis');
      console.log('3. Dateiberechtigungen\n');
      console.log('='.repeat(80) + '\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ KRITISCHER FEHLER:', error.message);
    console.error('\nBitte überprüfen Sie:');
    console.error('1. Datenbankverbindung');
    console.error('2. DATABASE_URL Umgebungsvariable');
    console.error('3. Drizzle Schema\n');
    process.exit(1);
  }
}

// Seed-Prozess starten
seedTemplates();
