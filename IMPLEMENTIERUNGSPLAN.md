# IMPLEMENTIERUNGSPLAN - ANGELUS UNTERNEHMENSANLEIHEN PORTAL

## Übersicht

Dieser Plan beschreibt die schrittweise Integration der 4 professionellen Vertragsvorlagen in das Angelus Portal für Unternehmensanleihen.

---

## PHASE 1: VERTRAGSVORLAGEN IN DATENBANK LADEN

### Schritt 1.1: Vertragsvorlagen manuell im Admin-Interface erstellen

**Ort:** Admin Dashboard → Produkte & Verträge → Tab "Vertragsvorlagen"

**Zu erstellende Vorlagen:**

1. **Unternehmensanleihe-Vereinbarung**
   - Datei: `01-Unternehmensanleihe-Vereinbarung-FINAL.txt`
   - Typ: Zeichnungsvereinbarung
   - Beschreibung: Rechtlich bindende Vereinbarung für die Zeichnung von Unternehmensanleihen
   - Inhalt: Kopieren Sie den vollständigen Text aus der Datei

2. **Risikooffenlegung**
   - Datei: `02-Risikooffenlegung-FINAL.txt`
   - Typ: Risikowarnung
   - Beschreibung: Umfassende Risikowarnung für Investoren
   - Inhalt: Kopieren Sie den vollständigen Text aus der Datei

3. **Allgemeine Geschäftsbedingungen (AGB)**
   - Datei: `03-AGB-Anleihen-FINAL.txt`
   - Typ: AGB
   - Beschreibung: Allgemeine Geschäftsbedingungen für Anleihen
   - Inhalt: Kopieren Sie den vollständigen Text aus der Datei

4. **KYC/AML-Vereinbarung**
   - Datei: `04-KYC-AML-Vereinbarung-Anleihen-FINAL.txt`
   - Typ: Compliance
   - Beschreibung: Know Your Customer und Anti-Geldwäsche Vereinbarung
   - Inhalt: Kopieren Sie den vollständigen Text aus der Datei

### Schritt 1.2: Vertragsvorlagen verifizieren

- Stellen Sie sicher, dass alle 4 Vorlagen im Admin-Interface sichtbar sind
- Überprüfen Sie, dass die Inhalte korrekt angezeigt werden
- Testen Sie die Vorschau-Funktion

---

## PHASE 2: TEST-ANLEIHE "ANGELUS BOND 2026" ERSTELLEN

### Schritt 2.1: Test-Bond im Admin-Interface anlegen

**Ort:** Admin Dashboard → Produkte & Verträge → Tab "Produkte"

**Bond-Details:**

| Parameter | Wert |
|-----------|------|
| **Anleihebezeichnung** | Angelus Unternehmensanleihe 2026-2030 |
| **Anleihenummer** | ANGELUS-2026-001 |
| **Gesamtvolumen** | EUR 3.000.000,00 |
| **Mindestzeichnung** | EUR 100.000,00 |
| **Nennwert pro Anleihe** | EUR 1.000,00 |
| **Zeichnungspreis** | 100% des Nennwerts |
| **Zinssatz** | 12,00% pro Jahr (fix) |
| **Zinszahlung** | Jährlich am 01. Januar |
| **Ausgabedatum** | [Aktuelles Datum] |
| **Fälligkeitsdatum** | 21. Januar 2030 |
| **Laufzeit** | Circa 4 Jahre |
| **Sperrfrist** | 24 Monate |
| **Kündigungsfrist** | 12 Monate |
| **Vorfälligkeitsentschädigung** | 20% |
| **Anwendbares Recht** | Schweizer Recht (Kanton Zürich) |
| **Status** | Aktiv |

### Schritt 2.2: Vertragsvorlagen zum Bond zuordnen

**Ort:** Admin Dashboard → Produkte & Verträge → Bond bearbeiten → "Vertragsvorlagen zuordnen"

**Zuordnung (in dieser Reihenfolge):**

1. ✅ Unternehmensanleihe-Vereinbarung (Pflicht - muss akzeptiert werden)
2. ✅ Risikooffenlegung (Pflicht - muss akzeptiert werden)
3. ✅ Allgemeine Geschäftsbedingungen (Pflicht - muss akzeptiert werden)
4. ✅ KYC/AML-Vereinbarung (Pflicht - muss akzeptiert werden)

---

## PHASE 3: INVESTOR-ZEICHNUNGSFLOW TESTEN

### Schritt 3.1: Test-Investor-Account erstellen

- Erstellen Sie einen Test-Investor-Account mit E-Mail: `test-investor@example.com`
- Oder verwenden Sie einen bestehenden Investor-Account

### Schritt 3.2: Zeichnungsflow durchlaufen

**Ort:** Investor Dashboard → Verfügbare Anleihen → "Angelus Unternehmensanleihe 2026-2030"

**Ablauf:**

1. **Anleihe-Details anzeigen**
   - Überprüfen Sie, dass alle Bond-Informationen korrekt angezeigt werden
   - Überprüfen Sie, dass die Mindestzeichnung EUR 100.000,00 angezeigt wird

2. **Zeichnungsformular ausfüllen**
   - Zeichnungsbetrag: EUR 100.000,00 (Mindestzeichnung)
   - Überprüfen Sie, dass der Betrag >= EUR 100.000,00 sein muss

3. **Vertragsvorlagen akzeptieren**
   - Investor muss alle 4 Vertragsvorlagen lesen und akzeptieren:
     1. Unternehmensanleihe-Vereinbarung
     2. Risikooffenlegung
     3. AGB
     4. KYC/AML-Vereinbarung
   - Jede Vorlage muss durch einen Checkbox akzeptiert werden
   - Jede Akzeptanz wird als Checkpoint bestätigt (nicht durch Unterschrift)

4. **KYC-Überprüfung**
   - Investor muss KYC-Daten eingeben:
     - Identitätsprüfung (Ausweisdokument)
     - Adressverifizierung
     - Vermögensherkunft
   - System überprüft automatisch Sanktionslisten und PEP-Status

5. **Zahlungsbestätigung**
   - Investor erhält Zahlungsanweisung
   - Zahlungsfrist: 5 Tage nach Zeichnung
   - Zahlungsart: Banküberweisung

6. **Zeichnung abschließen**
   - Nach erfolgreicher Zahlung wird die Zeichnung bestätigt
   - Investor erhält Bestätigung per E-Mail
   - Zeichnung wird im Investor-Dashboard angezeigt

### Schritt 3.3: Consent-Logging überprüfen

- Überprüfen Sie, dass alle Checkpoint-Bestätigungen geloggt werden
- Überprüfen Sie, dass die Timestamps und Investor-Daten korrekt sind
- Überprüfen Sie, dass die Consent-Logs im Admin-Dashboard sichtbar sind

---

## PHASE 4: ADMIN-FUNKTIONEN TESTEN

### Schritt 4.1: Zeichnungen verwalten

**Ort:** Admin Dashboard → Zeichnungen

- Überprüfen Sie, dass die Test-Zeichnung angezeigt wird
- Überprüfen Sie, dass alle Zeichnungsdetails korrekt sind
- Überprüfen Sie, dass der Zeichnungsstatus "Ausstehend" oder "Bestätigt" ist

### Schritt 4.2: KYC-Status überprüfen

**Ort:** Admin Dashboard → KYC Checks

- Überprüfen Sie, dass der KYC-Status des Test-Investors angezeigt wird
- Überprüfen Sie, dass die KYC-Daten korrekt gespeichert sind
- Überprüfen Sie, dass Sanktionslisten-Überprüfungen durchgeführt wurden

### Schritt 4.3: Consent-Logs überprüfen

**Ort:** Admin Dashboard → Zeichnungen → Zeichnung bearbeiten → "Consent-Logs"

- Überprüfen Sie, dass alle 4 Vertragsvorlagen-Akzeptanzen geloggt sind
- Überprüfen Sie, dass die Timestamps korrekt sind
- Überprüfen Sie, dass die Investor-Daten korrekt sind

---

## PHASE 5: FEHLERBEHANDLUNG UND EDGE CASES

### Schritt 5.1: Fehlerhafte Eingaben testen

- Versuchen Sie, eine Zeichnung unter EUR 100.000,00 zu erstellen → sollte abgelehnt werden
- Versuchen Sie, eine Zeichnung ohne Vertragsvorlagen-Akzeptanz zu erstellen → sollte abgelehnt werden
- Versuchen Sie, eine Zeichnung ohne KYC-Daten zu erstellen → sollte abgelehnt werden

### Schritt 5.2: Zahlungsverzug testen

- Erstellen Sie eine Zeichnung und warten Sie 5+ Tage ohne Zahlung
- Überprüfen Sie, dass das System eine Zahlungserinnerung sendet
- Überprüfen Sie, dass die Zeichnung nach 60 Tagen automatisch storniert wird

### Schritt 5.3: Sanktionslisten-Test

- Versuchen Sie, einen Investor mit Namen auf einer Sanktionsliste zu registrieren
- Überprüfen Sie, dass die Zeichnung automatisch abgelehnt wird

---

## PHASE 6: DOKUMENTATION UND SCHULUNG

### Schritt 6.1: Admin-Dokumentation erstellen

- Erstellen Sie eine Anleitung für Admins zur Verwaltung von Anleihen
- Dokumentieren Sie die Zeichnungsverwaltung
- Dokumentieren Sie die KYC-Verwaltung
- Dokumentieren Sie die Consent-Verwaltung

### Schritt 6.2: Investor-Dokumentation erstellen

- Erstellen Sie eine Anleitung für Investoren zum Zeichnungsflow
- Dokumentieren Sie die Vertragsvorlagen
- Dokumentieren Sie die KYC-Anforderungen
- Dokumentieren Sie die Zahlungsbedingungen

---

## PHASE 7: PRODUKTION - LIVE GEHEN

### Schritt 7.1: Sicherheitsüberprüfung

- [ ] Alle Vertragsvorlagen sind rechtlich geprüft
- [ ] Alle Klauseln sind mit Schweizer Recht konsistent
- [ ] Alle Schiedsgerichtsklauseln sind korrekt
- [ ] Alle Datenschutzbestimmungen sind implementiert

### Schritt 7.2: Performance-Tests

- [ ] Testen Sie die Zeichnung mit 100+ gleichzeitigen Investoren
- [ ] Überprüfen Sie die Datenbankperformance
- [ ] Überprüfen Sie die API-Performance

### Schritt 7.3: Live-Schaltung

- [ ] Aktivieren Sie die Anleihe im Produktionssystem
- [ ] Benachrichtigen Sie Investoren über die neue Anleihe
- [ ] Überwachen Sie die ersten Zeichnungen

---

## CHECKLISTE - IMPLEMENTIERUNG

### Vertragsvorlagen
- [ ] Unternehmensanleihe-Vereinbarung im Portal
- [ ] Risikooffenlegung im Portal
- [ ] AGB im Portal
- [ ] KYC/AML-Vereinbarung im Portal

### Test-Bond
- [ ] Bond "Angelus Unternehmensanleihe 2026-2030" erstellt
- [ ] Alle Bond-Details korrekt eingegeben
- [ ] Alle 4 Vertragsvorlagen zugeordnet
- [ ] Bond-Status auf "Aktiv" gesetzt

### Investor-Flow
- [ ] Test-Investor kann Zeichnung durchführen
- [ ] Alle 4 Vertragsvorlagen werden angezeigt
- [ ] Investor kann Vertragsvorlagen akzeptieren
- [ ] KYC-Daten werden eingegeben
- [ ] Zahlungsanweisung wird generiert
- [ ] Zeichnung wird bestätigt

### Admin-Funktionen
- [ ] Zeichnungen sind im Admin-Dashboard sichtbar
- [ ] KYC-Status ist im Admin-Dashboard sichtbar
- [ ] Consent-Logs sind im Admin-Dashboard sichtbar
- [ ] Admin kann Zeichnungen verwalten

### Fehlerbehandlung
- [ ] Mindestzeichnung wird überprüft
- [ ] Vertragsvorlagen-Akzeptanz wird überprüft
- [ ] KYC-Daten werden überprüft
- [ ] Zahlungsverzug wird überprüft

---

## ZEITPLAN

| Phase | Aufgabe | Dauer | Status |
|-------|---------|-------|--------|
| 1 | Vertragsvorlagen laden | 30 Min | ⏳ |
| 2 | Test-Bond erstellen | 30 Min | ⏳ |
| 3 | Zeichnungsflow testen | 2 Std | ⏳ |
| 4 | Admin-Funktionen testen | 1 Std | ⏳ |
| 5 | Fehlerbehandlung testen | 1 Std | ⏳ |
| 6 | Dokumentation | 2 Std | ⏳ |
| 7 | Live-Schaltung | 1 Std | ⏳ |
| **GESAMT** | | **7,5 Std** | |

---

## SUPPORT & TROUBLESHOOTING

### Häufige Probleme

**Problem:** Vertragsvorlagen werden nicht im Zeichnungsflow angezeigt
- **Lösung:** Überprüfen Sie, dass die Vorlagen dem Bond zugeordnet sind

**Problem:** KYC-Überprüfung schlägt fehl
- **Lösung:** Überprüfen Sie, dass die KYC-Daten vollständig sind

**Problem:** Zahlungsanweisung wird nicht generiert
- **Lösung:** Überprüfen Sie, dass das Zahlungskonto konfiguriert ist

---

## NÄCHSTE SCHRITTE

1. ✅ Alle 4 Vertragsvorlagen sind bereit
2. ⏳ Vertragsvorlagen im Admin-Interface laden (JETZT STARTEN)
3. ⏳ Test-Bond "Angelus Unternehmensanleihe 2026-2030" erstellen
4. ⏳ Investor-Zeichnungsflow testen
5. ⏳ Admin-Funktionen testen
6. ⏳ Fehlerbehandlung testen
7. ⏳ Live-Schaltung

---

**Dokumente verfügbar in:** `/home/ubuntu/angelus-portal/docs/`

- `01-Unternehmensanleihe-Vereinbarung-FINAL.txt`
- `02-Risikooffenlegung-FINAL.txt`
- `03-AGB-Anleihen-FINAL.txt`
- `04-KYC-AML-Vereinbarung-Anleihen-FINAL.txt`
