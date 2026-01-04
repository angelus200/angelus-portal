# Consent Audit System - Dokumentation

## Überblick

Das Angelus Portal implementiert ein vollständiges **Consent-Management-System** mit integriertem **Audit-Trail** für Compliance und Dokumentation. Das System basiert ausschließlich auf **Checkbox-basierten Zustimmungen** ohne digitale Signaturen.

## Systemarchitektur

### 1. Datenbank-Tabellen

#### `consents` - Zustimmungsmanagement
Speichert die aktuellen Zustimmungsstatus pro Benutzer und Beteiligung.

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `id` | INT | Primärschlüssel |
| `userId` | INT | Benutzer-ID |
| `bondId` | INT | Beteiligungen-ID |
| `consentType` | ENUM | Art der Zustimmung (risk_disclosure, terms_conditions, subscription_agreement, kyc_confirmation, prospectus_acknowledgment) |
| `accepted` | BOOLEAN | Zustimmungsstatus (true/false) |
| `acceptedAt` | TIMESTAMP | Zeitstempel der Zustimmung |
| `createdAt` | TIMESTAMP | Erstellungsdatum |
| `updatedAt` | TIMESTAMP | Änderungsdatum |

#### `consent_logs` - Audit-Trail
Vollständiges Audit-Log aller Zustimmungsaktionen für Compliance-Nachweise.

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `id` | INT | Primärschlüssel |
| `userId` | INT | Benutzer-ID |
| `bondId` | INT | Beteiligungen-ID |
| `consentType` | ENUM | Art der Zustimmung |
| `action` | ENUM | Aktion (accepted, rejected, revoked) |
| `ipAddress` | VARCHAR(45) | IP-Adresse des Benutzers |
| `userAgent` | TEXT | Browser-Informationen |
| `consentVersion` | VARCHAR(16) | Versionsnummer der Zustimmung |
| `metadata` | JSON | Zusätzliche Metadaten |
| `createdAt` | TIMESTAMP | Zeitstempel der Aktion |

### 2. Consent-Typen

Das System unterstützt folgende Zustimmungstypen:

- **risk_disclosure** - Risikooffenlegung
- **terms_conditions** - Allgemeine Geschäftsbedingungen
- **subscription_agreement** - Zeichnungsvereinbarung
- **kyc_confirmation** - KYC-Bestätigung
- **prospectus_acknowledgment** - Prospekt-Bestätigung

### 3. Aktionen im Audit-Trail

Jede Benutzeraktion wird mit folgenden Details protokolliert:

- **accepted** - Benutzer hat Zustimmung akzeptiert
- **rejected** - Benutzer hat Zustimmung abgelehnt
- **revoked** - Admin hat Zustimmung widerrufen

## API-Endpunkte (tRPC)

### Zustimmungen verwalten

#### `consents.upsert`
Zustimmung erstellen oder aktualisieren.

```typescript
await trpc.consents.upsert.mutate({
  userId: 1,
  bondId: 1,
  consentType: "risk_disclosure",
  accepted: true
});
```

#### `consents.getByBond`
Alle Zustimmungen für eine Beteiligung abrufen.

```typescript
const consents = await trpc.consents.getByBond.query({ bondId: 1 });
```

### Audit-Logs abrufen

#### `consents.getLogsForBond`
Alle Audit-Logs für eine Beteiligung abrufen (nur Admin).

```typescript
const logs = await trpc.consents.getLogsForBond.query({ bondId: 1 });
```

#### `consents.getLogsForUser`
Alle Audit-Logs für einen Benutzer abrufen (Admin oder Benutzer selbst).

```typescript
const logs = await trpc.consents.getLogsForUser.query({ userId: 1 });
```

#### `consents.logConsentAction`
Manuelle Protokollierung einer Zustimmungsaktion.

```typescript
await trpc.consents.logConsentAction.mutate({
  userId: 1,
  bondId: 1,
  consentType: "risk_disclosure",
  action: "accepted",
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  consentVersion: "1.0"
});
```

#### `consents.exportLogs`
Export aller Audit-Logs für Compliance (nur Admin).

```typescript
const logs = await trpc.consents.exportLogs.query({ bondId: 1 });
```

## Compliance-Nachweise

### Dokumentation pro Zustimmung

Für jede Zustimmung werden folgende Informationen dokumentiert:

1. **Benutzer-Identifikation**
   - User-ID
   - Email
   - Name
   - Adresse

2. **Zustimmungs-Details**
   - Zustimmungstyp
   - Beteiligungen-ID
   - Zustimmungsstatus (akzeptiert/abgelehnt)

3. **Zeitliche Informationen**
   - Zeitstempel der Zustimmung
   - Zeitstempel der Protokollierung

4. **Technische Informationen**
   - IP-Adresse
   - Browser-Informationen (User-Agent)
   - Zustimmungs-Versionsnummer

5. **Audit-Trail**
   - Alle Statusänderungen
   - Wer hat was wann geändert
   - Grund der Änderung (falls vorhanden)

### Export für Behörden

Das System ermöglicht den Export aller Audit-Logs in strukturierter Form:

```typescript
// Export aller Logs für eine Beteiligung
const logs = await trpc.consents.exportLogs.query({ bondId: 1 });

// Format: Array von Consent-Log-Objekten mit allen Details
[
  {
    id: 1,
    userId: 1,
    bondId: 1,
    consentType: "risk_disclosure",
    action: "accepted",
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0...",
    consentVersion: "1.0",
    createdAt: "2026-01-04T16:00:00Z"
  },
  // ... weitere Logs
]
```

## Investor-Workflow

### 1. Zustimmungsanforderung
Beim Zeichnen einer Beteiligung sieht der Investor alle erforderlichen Zustimmungen als Checkboxen.

### 2. Zustimmung akzeptieren
Der Investor aktiviert die Checkboxen für jede erforderliche Zustimmung.

### 3. Audit-Logging
Jede Zustimmung wird automatisch im Audit-Trail protokolliert mit:
- Zeitstempel
- IP-Adresse
- Browser-Informationen
- Zustimmungstyp

### 4. Bestätigung
Nach Akzeptanz aller Zustimmungen kann die Zeichnung abgeschlossen werden.

## Admin-Funktionen

### 1. Zustimmungs-Übersicht
Admin kann alle Zustimmungen pro Beteiligung einsehen.

### 2. Audit-Log-Anzeige
Admin kann das vollständige Audit-Trail für jede Beteiligung oder jeden Benutzer abrufen.

### 3. Export für Compliance
Admin kann alle Audit-Logs exportieren für:
- Behördliche Anfragen
- Compliance-Prüfungen
- Interne Audits
- Datenschutz-Anfragen

### 4. Zustimmung widerrufen
Admin kann Zustimmungen widerrufen (mit Audit-Logging).

## Sicherheit und Datenschutz

### Datensicherheit
- Alle Zustimmungen sind mit Benutzer-ID und Beteiligungen-ID verknüpft
- Audit-Logs sind unveränderlich (nur Lesen, keine Änderung)
- IP-Adressen und Browser-Informationen werden protokolliert

### Zugriffskontrolle
- Nur Admins können Audit-Logs abrufen
- Benutzer können nur ihre eigenen Logs einsehen
- Sensible Daten sind geschützt

### DSGVO-Konformität
- Alle Datenverarbeitungen sind dokumentiert
- Benutzer können ihre Daten exportieren
- Audit-Trail ermöglicht Nachverfolgung aller Aktivitäten

## Compliance-Anforderungen

Das System erfüllt folgende Compliance-Anforderungen:

1. **Nachweisbarkeit** - Alle Zustimmungen sind mit Zeitstempel und IP-Adresse dokumentiert
2. **Unveränderbarkeit** - Audit-Logs können nicht nachträglich geändert werden
3. **Transparenz** - Benutzer können ihre Zustimmungshistorie einsehen
4. **Rückverfolgbarkeit** - Admin kann nachvollziehen, wer wann welcher Zustimmung zugestimmt hat
5. **Exportierbarkeit** - Alle Daten können für behördliche Anfragen exportiert werden

## Implementierung im Frontend

### Subscribe-Komponente
Die Subscribe-Komponente zeigt alle erforderlichen Zustimmungen als Checkboxen:

```typescript
// Consent-State
const [consents, setConsents] = useState<Record<string, boolean>>({});

// Checkboxen für jede Zustimmung
{requiredConsents.map((consentType) => (
  <Checkbox
    key={consentType}
    checked={consents[consentType] || false}
    onCheckedChange={(checked) => {
      setConsents(prev => ({
        ...prev,
        [consentType]: checked
      }));
      // Audit-Logging
      trpc.consents.logConsentAction.mutate({
        userId: user.id,
        bondId: bondId,
        consentType,
        action: checked ? "accepted" : "rejected",
        ipAddress: getClientIp(),
        userAgent: navigator.userAgent,
        consentVersion: "1.0"
      });
    }}
  />
))}
```

## Zukünftige Erweiterungen

1. **Consent-Versionierung** - Unterschiedliche Versionen von Zustimmungstexten verwalten
2. **Automatische Benachrichtigungen** - Benutzer benachrichtigen, wenn neue Zustimmungen erforderlich sind
3. **Consent-Widerrufs-Workflow** - Benutzer können Zustimmungen widerrufen
4. **Batch-Export** - Export mehrerer Beteiligungen auf einmal
5. **Compliance-Reports** - Automatische Generierung von Compliance-Reports

---

**Dokumentation erstellt:** 2026-01-04  
**Version:** 1.0  
**Status:** Produktiv
