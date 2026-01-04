# Test-Anleihe "Angelus Bond 2026" - Anleitung

## Schritt 1: Vertragsvorlagen erstellen

Gehen Sie zu **Admin Dashboard → Produkte & Verträge → Tab 2: Vertragsvorlagen**

Erstellen Sie 5 neue Vertragsvorlagen mit folgendem Inhalt:

### 1. Zeichnungsvereinbarung
- **Name:** Zeichnungsvereinbarung
- **Typ:** Subscription Agreement
- **Inhalt:** (siehe unten)
- **Gültig ab:** 01.01.2026

```
ZEICHNUNGSVEREINBARUNG
Angelus Bond 2026

1. Vertragsparteien
Emittent: Angelus Management KG, München
Zeichner: Der Investor

2. Angebotsbedingungen
- Anleihenvolumen: EUR 3.000.000
- Mindestzeichnung: EUR 100.000
- Zinssatz: 12% p.a.
- Zinszahlung: Jährlich
- Beginn: 01.01.2026
- Ende: 21.01.2030
- Laufzeit: 48 Monate

3. Kündigungsbestimmungen
- Mindestlaufzeit: 24 Monate
- Kündigungsfrist: 12 Monate nach Mindestlaufzeit
- Vorfälligkeit: Max. 20% der Zeichnungssumme pro Jahr

4. Anwendbares Recht
Diese Anleihe unterliegt Schweizer Recht.

5. Besonderheiten
- Rangrücktritt im Insolvenzfall
- Insolvenzvorbehalt

6. Unterschrift
Mit der Zustimmung zu dieser Zeichnungsvereinbarung akzeptieren Sie alle Bedingungen.
```

### 2. Risikooffenlegung
- **Name:** Risikooffenlegung
- **Typ:** Risk Disclosure
- **Inhalt:** (siehe unten)

```
RISIKOOFFENLEGUNG
Angelus Bond 2026

1. Emittenten-Risiko
Die Anleihe wird von der Angelus Management KG emittiert. Das Risiko hängt von der Kreditwürdigkeit des Emittenten ab.

2. Subordinations-Risiko
Diese Anleihe ist nachrangig (subordiniert). Im Insolvenzfall werden Gläubiger dieser Anleihe erst nach vorrangigen Gläubigern bedient.

3. Insolvenzvorbehalt
Im Falle der Insolvenz des Emittenten können Zahlungen nicht garantiert werden.

4. Zinsrisiko
Bei Marktveränderungen kann der Wert der Anleihe sinken.

5. Liquiditätsrisiko
Die Anleihe ist nicht börsengehandelt. Ein Verkauf vor Fälligkeit ist schwierig.

6. Währungsrisiko
Die Anleihe ist in EUR denominiert. Währungsschwankungen können den Wert beeinflussen.

7. Kündigungsrisiko
Der Emittent kann die Anleihe unter den genannten Bedingungen kündigen.

Bestätigung: Ich bestätige, dass ich alle Risiken verstanden habe und diese akzeptiere.
```

### 3. Allgemeine Geschäftsbedingungen
- **Name:** Allgemeine Geschäftsbedingungen
- **Typ:** Terms & Conditions
- **Inhalt:** (siehe unten)

```
ALLGEMEINE GESCHÄFTSBEDINGUNGEN
Angelus Bond 2026

1. Zeichnungsprozess
Die Zeichnung erfolgt über das Angelus Portal. Der Zeichner muss alle erforderlichen Informationen bereitstellen.

2. Zahlungen
Zinszahlungen erfolgen jährlich am 01.01. auf das angegebene Bankkonto.

3. Rückzahlung
Die Rückzahlung des Kapitals erfolgt am 21.01.2030 oder bei vorzeitiger Kündigung.

4. Kündigungsverfahren
Kündigungen müssen schriftlich eingereicht werden. Die Kündigungsfrist beträgt 12 Monate.

5. Änderungen
Änderungen dieser Bedingungen werden dem Zeichner mitgeteilt.

6. Datenschutz
Persönliche Daten werden gemäß DSGVO behandelt.

7. Streitigkeiten
Streitigkeiten werden vor Schweizer Gerichten beigelegt.
```

### 4. KYC-Bestätigung
- **Name:** KYC-Bestätigung
- **Typ:** KYC Confirmation
- **Inhalt:** (siehe unten)

```
KYC-BESTÄTIGUNG (KNOW YOUR CUSTOMER)
Angelus Bond 2026

1. Identitätsbestätigung
Ich bestätige, dass meine Identität überprüft wurde und alle Informationen korrekt sind.

2. Geldwäschebekämpfung
Ich bestätige, dass ich nicht auf einer Sanktionsliste stehe und nicht an illegalen Aktivitäten beteiligt bin.

3. Herkunft der Mittel
Ich bestätige, dass die Mittel aus legalen Quellen stammen.

4. Wirtschaftlich Berechtigter
Ich bestätige, dass ich der wirtschaftlich Berechtigte bin oder vollmächtig handele.

5. Compliance
Ich akzeptiere alle Compliance-Anforderungen und Meldepflichten.

6. Bestätigung
Ich bestätige die Richtigkeit aller Angaben und akzeptiere die KYC-Anforderungen.
```

### 5. Prospekt-Bestätigung
- **Name:** Prospekt-Bestätigung
- **Typ:** Prospectus Acknowledgment
- **Inhalt:** (siehe unten)

```
PROSPEKT-BESTÄTIGUNG
Angelus Bond 2026

1. Prospekt erhalten
Ich bestätige, dass ich den Prospekt für die Angelus Bond 2026 erhalten habe.

2. Prospekt gelesen
Ich bestätige, dass ich den Prospekt vollständig gelesen und verstanden habe.

3. Informationen verstanden
Ich bestätige, dass ich alle Informationen zum Angebot, den Bedingungen und den Risiken verstanden habe.

4. Beratung
Ich bestätige, dass ich bei Bedarf unabhängige Finanzberatung in Anspruch genommen habe.

5. Investitionsentscheidung
Ich treffe meine Investitionsentscheidung auf Grundlage des Prospekts und meiner eigenen Analyse.

6. Bestätigung
Ich bestätige alle obigen Punkte und erkläre mich bereit, in die Angelus Bond 2026 zu investieren.
```

## Schritt 2: Test-Bond anlegen

Gehen Sie zu **Admin Dashboard → Produkte & Verträge → Tab 1: Produkte**

Klicken Sie auf **+ Neues Produkt** und füllen Sie folgende Felder aus:

### Produktdetails
- **Name:** Angelus Bond 2026
- **Bondnummer:** AB-2026-001
- **Beschreibung:** Nachrangige Anleihe nach Schweizer Recht mit Rangrücktritt und Insolvenzvorbehalt
- **Gesamtvolumen:** 3000000
- **Verfügbares Volumen:** 3000000
- **Mindestzeichnung:** 100000
- **Zinssatz:** 12
- **Laufzeit (Monate):** 48
- **Coupon-Zahlungsfrequenz:** Jährlich
- **Währung:** EUR
- **Emittent:** Angelus Management KG
- **Sektor:** Finanzdienstleistungen
- **Status:** Aktiv

### Kündigungsbestimmungen
- **Kündigungsfrist:** 12
- **Kündigungstermin:** 24
- **Beginn:** 01.01.2026
- **Ende:** 21.01.2030

### Besonderheiten
- ✓ Schweizer Recht
- ✓ Rangrücktritt
- ✓ Insolvenzvorbehalt

### Vertragsvorlagen zuordnen
Wählen Sie alle 5 Vertragsvorlagen aus:
- ✓ Zeichnungsvereinbarung
- ✓ Risikooffenlegung
- ✓ Allgemeine Geschäftsbedingungen
- ✓ KYC-Bestätigung
- ✓ Prospekt-Bestätigung

Klicken Sie auf **Speichern**

## Schritt 3: Testen

1. **Melden Sie sich als Investor an**
2. **Gehen Sie zu:** Investor Dashboard → Beteiligungen → Angelus Bond 2026
3. **Klicken Sie auf:** Zeichnen
4. **Überprüfen Sie:**
   - Alle 5 Vertragsvorlagen sind sichtbar
   - Sie können jede Vorlage lesen (Modal öffnet sich)
   - Sie müssen alle Zustimmungs-Checkboxen akzeptieren, bevor Sie weiter können
   - Audit-Trail protokolliert alle Aktionen

## Fertig!

Die Test-Anleihe "Angelus Bond 2026" ist jetzt vollständig eingerichtet und bereit zum Testen.
