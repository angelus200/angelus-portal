# 🚀 Wallet-Based Investment System - Implementierungsplan

**Projekt:** Angelus Portal - Wallet-First Investment Flow
**Datum:** 2026-01-24
**Status:** Planning Phase
**Ziel:** Investoren zahlen erst Guthaben ein, investieren dann aus Wallet-Balance

---

## 1. ZIEL-FLOW BESCHREIBUNG

### 📋 Kompletter User Journey

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: ONBOARDING (bereits implementiert)                │
└─────────────────────────────────────────────────────────────┘
1. User registriert sich (Clerk Authentication)
2. User füllt Risikoprofil aus → Kategorie: conservative/moderate/risk_seeking
3. User durchläuft KYC-Prozess → Status: verified
4. User erhält Zugang zum Investor Dashboard

┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: WALLET-AUFLADUNG (NEU - Priority 1)               │
└─────────────────────────────────────────────────────────────┘
5. User navigiert zu "Wallet" Seite
6. User wählt "Einzahlung" → Betrag eingeben (min. €1,000)
7. User klickt "Mit Kreditkarte zahlen" (Stripe Checkout)
   → Redirect zu Stripe Hosted Checkout Page
   → Zahlungsmethoden: Kreditkarte, SEPA Direct Debit, Apple Pay, Google Pay
8. User zahlt erfolgreich → Stripe webhook.checkout.session.completed
9. System credited automatisch Wallet (walletTransaction: type=credit, status=completed)
10. User kehrt zurück → Wallet Balance updated (z.B. €10,000.00)

Alternative: Banküberweisung (manuell, bereits implementiert)

┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: INVESTMENT AUS WALLET (Modifiziert bestehend)     │
└─────────────────────────────────────────────────────────────┘
11. User browst Bonds → Wählt Bond aus (z.B. "Swiss Corporate Bond 5.5%")
12. User klickt "Zeichnen" → Subscribe-Seite
13. System prüft:
    ✅ KYC Status = verified
    ✅ Risk Profile vorhanden
    ✅ Wallet Balance ≥ Investment Amount
14. User gibt Betrag ein (min. €100,000)
15. System zeigt: "Verfügbar: €10,000 | Benötigt: €100,000 | Fehlend: €90,000"
16. User bestätigt alle Compliance-Checkboxen (12 Stück)
17. User klickt "Jetzt investieren"
18. System:
    → Erstellt Subscription (status=pending, paymentStatus=pending)
    → Erstellt walletTransaction (type=debit, amount=100000, status=pending)
    → Sperrt Betrag in Wallet (balance bleibt gleich, availableBalance -= 100000)
19. Admin-Freigabe erforderlich (neue Funktion):
    → Admin prüft Subscription in Admin Panel
    → Admin klickt "Genehmigen"
    → System:
       • walletTransaction.status = completed
       • Wallet.balance -= 100000
       • subscription.status = active
       • subscription.paymentStatus = completed
       • paymentSchedule entries erstellt (für Zinszahlungen)

Alternative: Ablehnung durch Admin
    → walletTransaction.status = cancelled
    → availableBalance += 100000 (Freigabe)
    → subscription.status = cancelled

┌─────────────────────────────────────────────────────────────┐
│ PHASE 4: ZINSZAHLUNGEN (bereits implementiert)             │
└─────────────────────────────────────────────────────────────┘
20. Monatlich/Jährlich (je nach Bond):
    → System erstellt walletTransaction (type=credit, Zinsbetrag)
    → Wallet Balance erhöht sich
    → User sieht Zinsen in Transaktionshistorie

┌─────────────────────────────────────────────────────────────┐
│ PHASE 5: VORZEITIGE AUSZAHLUNG MIT PENALTY (NEU)           │
└─────────────────────────────────────────────────────────────┘
21. User navigiert zu "Meine Investments" → Wählt aktive Subscription
22. User klickt "Vorzeitig auszahlen"
23. System zeigt Dialog:
    "Investment: €100,000
     Laufzeit: 12/60 Monate (20% abgelaufen)
     Penalty: 20% = €20,000
     Sie erhalten: €80,000

     ⚠️ WARNUNG: Vorzeitige Auszahlung nicht reversibel!"
24. User bestätigt mit Passwort + 2FA
25. System:
    → subscription.status = cancelled
    → Berechnet Penalty (20% des Investmentbetrags)
    → Erstellt walletTransaction (type=credit, amount=80000, description="Early withdrawal with 20% penalty")
    → Wallet.balance += 80000
    → Erstellt auditLog Eintrag
26. User kann nun €80,000 aus Wallet auszahlen lassen

┌─────────────────────────────────────────────────────────────┐
│ PHASE 6: WALLET-AUSZAHLUNG (bereits teilweise impl.)       │
└─────────────────────────────────────────────────────────────┘
27. User klickt "Auszahlung beantragen"
28. User gibt Betrag + Bankdaten ein
29. walletTransaction erstellt (type=withdrawal, status=pending)
30. Admin genehmigt → Überweisung ausgeführt
31. walletTransaction.status = completed, Wallet.balance -= amount
```

---

## 2. BESTANDSAUFNAHME

### ✅ **NICHT GEÄNDERT** (Behalten wie sie sind)

#### Datenbank-Tabellen:
- ✅ `users` - Keine Änderungen
- ✅ `bonds` - Keine Änderungen
- ✅ `contracts` - Keine Änderungen
- ✅ `contractTemplates` - Keine Änderungen
- ✅ `news` - Keine Änderungen
- ✅ `auditLogs` - Keine Änderungen
- ✅ `riskProfiles` - Keine Änderungen
- ✅ `profileChecks` - Keine Änderungen
- ✅ `consents` - Keine Änderungen
- ✅ `investorNotes` - Keine Änderungen

#### Backend Routers:
- ✅ `auth` Router - Keine Änderungen
- ✅ `bonds` Router - Keine Änderungen
- ✅ `investors` Router - Keine Änderungen
- ✅ `news` Router - Keine Änderungen
- ✅ `riskProfile` Router - Keine Änderungen
- ✅ `contracts` Router - Keine Änderungen
- ✅ `notes` Router - Keine Änderungen
- ✅ `profileCheck` Router - Keine Änderungen
- ✅ `consents` Router - Keine Änderungen

#### Frontend Komponenten:
- ✅ Login/SignUp Flow (Clerk) - Keine Änderungen
- ✅ Risk Profile Flow - Keine Änderungen
- ✅ KYC Flow - Keine Änderungen
- ✅ Bond Listing - Keine Änderungen
- ✅ Admin Dashboard - Keine Änderungen
- ✅ Admin Investors Management - Keine Änderungen
- ✅ Admin News Management - Keine Änderungen

---

### 🔧 **MODIFIZIERT** (Änderungen an bestehenden Funktionen)

#### Datenbank-Tabellen:
- 🔧 `wallets` - Neue Felder hinzufügen
- 🔧 `walletTransactions` - Neue Felder hinzufügen
- 🔧 `subscriptions` - Neue Felder hinzufügen
- 🔧 `paymentSchedules` - Keine Schema-Änderung, aber neue Logik

#### Backend Routers:
- 🔧 `wallet` Router - Neue Endpoints hinzufügen
- 🔧 `subscriptions` Router - Validierung + Wallet-Debit Logik
- 🔧 `payments` Router - Minimal (nur Admin Payment Schedule)

#### Frontend Komponenten:
- 🔧 `client/src/pages/investor/Wallet.tsx` - Stripe Checkout Button
- 🔧 `client/src/pages/investor/Subscribe.tsx` - Wallet Balance Check + Validierung
- 🔧 `client/src/pages/investor/MyInvestments.tsx` - Early Withdrawal Button
- 🔧 `client/src/pages/admin/Investors.tsx` - Subscription Approval Button

---

### ➕ **NEU HINZUGEFÜGT** (Komplett neue Funktionen)

#### Backend:
- ➕ `POST /api/stripe/create-checkout-session` - Stripe Checkout Session erstellen
- ➕ `POST /api/webhooks/stripe/checkout` - Stripe Checkout Webhook
- ➕ `POST /api/trpc/wallet.depositWithStripe` - Stripe Deposit initiieren
- ➕ `POST /api/trpc/subscriptions.approveSubscription` - Admin genehmigt Investment (adminProcedure)
- ➕ `POST /api/trpc/subscriptions.rejectSubscription` - Admin lehnt ab (adminProcedure)
- ➕ `POST /api/trpc/subscriptions.requestEarlyWithdrawal` - User beantragt vorzeitige Auszahlung
- ➕ `POST /api/trpc/subscriptions.approveEarlyWithdrawal` - Admin genehmigt (adminProcedure)
- ➕ Business Logic: `server/services/wallet-service.ts` - Wallet Operations
- ➕ Business Logic: `server/services/penalty-calculator.ts` - 20% Penalty Berechnung

#### Frontend:
- ➕ `client/src/components/wallet/StripeDepositDialog.tsx` - Stripe Checkout Dialog
- ➕ `client/src/components/subscription/EarlyWithdrawalDialog.tsx` - Vorzeitige Auszahlung
- ➕ `client/src/pages/admin/SubscriptionApproval.tsx` - Admin Subscription Genehmigung
- ➕ `client/src/hooks/useStripeCheckout.ts` - Custom Hook für Stripe
- ➕ Success/Cancel Pages:
  - `client/src/pages/payment/DepositSuccess.tsx`
  - `client/src/pages/payment/DepositCancelled.tsx`

---

## 3. DATENBANKÄNDERUNGEN

### 🆕 **Neue Felder in bestehenden Tabellen**

#### **wallets** Tabelle
```sql
ALTER TABLE wallets ADD COLUMN stripeCustomerId VARCHAR(255) AFTER depositAddress;
ALTER TABLE wallets ADD COLUMN lastDepositAt TIMESTAMP NULL AFTER stripeCustomerId;
ALTER TABLE wallets ADD COLUMN totalDeposited DECIMAL(24,8) DEFAULT 0 AFTER lastDepositAt;
ALTER TABLE wallets ADD COLUMN totalWithdrawn DECIMAL(24,8) DEFAULT 0 AFTER totalDeposited;

-- Index für Performance
CREATE INDEX idx_wallets_stripe_customer ON wallets(stripeCustomerId);
```

**Begründung:**
- `stripeCustomerId`: Verknüpfung mit Stripe Customer für wiederholte Zahlungen
- `lastDepositAt`: Tracking wann letzte Einzahlung erfolgte
- `totalDeposited`: Lifetime total aller Einzahlungen (Reporting)
- `totalWithdrawn`: Lifetime total aller Auszahlungen (Reporting)

---

#### **walletTransactions** Tabelle
```sql
ALTER TABLE walletTransactions ADD COLUMN stripePaymentIntentId VARCHAR(255) AFTER bankReference;
ALTER TABLE walletTransactions ADD COLUMN stripeCheckoutSessionId VARCHAR(255) AFTER stripePaymentIntentId;
ALTER TABLE walletTransactions ADD COLUMN relatedSubscriptionId INT AFTER description;
ALTER TABLE walletTransactions ADD COLUMN penaltyAmount DECIMAL(24,8) DEFAULT 0 AFTER relatedSubscriptionId;
ALTER TABLE walletTransactions ADD COLUMN originalAmount DECIMAL(24,8) AFTER penaltyAmount;

-- Indexes für Performance
CREATE INDEX idx_wallet_transactions_stripe_payment ON walletTransactions(stripePaymentIntentId);
CREATE INDEX idx_wallet_transactions_stripe_checkout ON walletTransactions(stripeCheckoutSessionId);
CREATE INDEX idx_wallet_transactions_subscription ON walletTransactions(relatedSubscriptionId);

-- Foreign Key Constraint
ALTER TABLE walletTransactions ADD CONSTRAINT fk_wallet_tx_subscription
  FOREIGN KEY (relatedSubscriptionId) REFERENCES subscriptions(id) ON DELETE SET NULL;
```

**Begründung:**
- `stripePaymentIntentId`: Verknüpfung mit Stripe Payment für Deposit
- `stripeCheckoutSessionId`: Verknüpfung mit Stripe Checkout Session
- `relatedSubscriptionId`: Welche Subscription hat diese Transaction ausgelöst?
- `penaltyAmount`: Bei early withdrawal: wie viel Penalty wurde abgezogen?
- `originalAmount`: Bei early withdrawal: ursprünglicher Betrag vor Penalty

---

#### **subscriptions** Tabelle
```sql
ALTER TABLE subscriptions ADD COLUMN walletTransactionId INT AFTER stripeCustomerId;
ALTER TABLE subscriptions ADD COLUMN approvedBy INT AFTER walletTransactionId;
ALTER TABLE subscriptions ADD COLUMN approvedAt TIMESTAMP NULL AFTER approvedBy;
ALTER TABLE subscriptions ADD COLUMN rejectedBy INT AFTER approvedAt;
ALTER TABLE subscriptions ADD COLUMN rejectedAt TIMESTAMP NULL AFTER rejectedBy;
ALTER TABLE subscriptions ADD COLUMN rejectionReason TEXT AFTER rejectedAt;
ALTER TABLE subscriptions ADD COLUMN earlyWithdrawalRequestedAt TIMESTAMP NULL AFTER rejectionReason;
ALTER TABLE subscriptions ADD COLUMN earlyWithdrawalApprovedAt TIMESTAMP NULL AFTER earlyWithdrawalRequestedAt;
ALTER TABLE subscriptions ADD COLUMN penaltyRate DECIMAL(5,2) DEFAULT 20.00 AFTER earlyWithdrawalApprovedAt;

-- Indexes
CREATE INDEX idx_subscriptions_wallet_tx ON subscriptions(walletTransactionId);
CREATE INDEX idx_subscriptions_approved_by ON subscriptions(approvedBy);

-- Foreign Keys
ALTER TABLE subscriptions ADD CONSTRAINT fk_subscription_wallet_tx
  FOREIGN KEY (walletTransactionId) REFERENCES walletTransactions(id) ON DELETE SET NULL;

ALTER TABLE subscriptions ADD CONSTRAINT fk_subscription_approved_by
  FOREIGN KEY (approvedBy) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE subscriptions ADD CONSTRAINT fk_subscription_rejected_by
  FOREIGN KEY (rejectedBy) REFERENCES users(id) ON DELETE SET NULL;
```

**Begründung:**
- `walletTransactionId`: Welche Wallet-Transaktion hat diese Subscription finanziert?
- `approvedBy`, `approvedAt`: Admin Approval Tracking
- `rejectedBy`, `rejectedAt`, `rejectionReason`: Admin Rejection Tracking
- `earlyWithdrawalRequestedAt`, `earlyWithdrawalApprovedAt`: Early Withdrawal Tracking
- `penaltyRate`: Configurable penalty (default 20%), kann pro Bond unterschiedlich sein

---

### 🆕 **Neue Enum-Werte**

#### **walletTransactions.type** Enum erweitern
```sql
-- Aktuell: "deposit", "withdrawal", "credit", "debit", "transfer"
-- Neu hinzufügen:
ALTER TABLE walletTransactions MODIFY COLUMN type
  ENUM('deposit', 'withdrawal', 'credit', 'debit', 'transfer',
       'investment_debit', 'penalty_deduction', 'early_withdrawal_credit') NOT NULL;
```

**Neue Typen:**
- `investment_debit`: Betrag wird für Investment abgebucht
- `penalty_deduction`: 20% Penalty bei early withdrawal
- `early_withdrawal_credit`: Rückzahlung nach early withdrawal (80% des Betrags)

---

#### **subscriptions.status** Enum erweitern
```sql
-- Aktuell: "pending", "confirmed", "active", "completed", "cancelled"
-- Neu hinzufügen:
ALTER TABLE subscriptions MODIFY COLUMN status
  ENUM('pending', 'pending_approval', 'confirmed', 'active', 'completed', 'cancelled',
       'rejected', 'early_withdrawal_requested', 'early_withdrawal_completed') NOT NULL;
```

**Neue Status:**
- `pending_approval`: Wartet auf Admin-Genehmigung
- `rejected`: Von Admin abgelehnt
- `early_withdrawal_requested`: User hat vorzeitige Auszahlung beantragt
- `early_withdrawal_completed`: Vorzeitige Auszahlung durchgeführt

---

### 📊 **Migration-Strategie (ZERO DOWNTIME)**

#### Phase 1: Schema Migration (Felder hinzufügen)
```sql
-- Alle ALTER TABLE Statements ausführen
-- Bestehende Daten bleiben unverändert
-- Neue Felder haben DEFAULT Werte oder sind NULL
```

**Risiko:** ✅ NIEDRIG - Nur ADD COLUMN, keine Daten-Änderung

---

#### Phase 2: Bestehende Daten migrieren (optional)
```sql
-- Falls alte Subscriptions auf neues System migriert werden sollen:
UPDATE subscriptions
SET status = 'pending_approval'
WHERE status = 'pending'
  AND paymentStatus = 'pending'
  AND createdAt > '2026-01-01'; -- Nur neue

-- Alte completed subscriptions bleiben wie sie sind
```

**Risiko:** ✅ NIEDRIG - Nur Status-Update, kein Datenverlust

---

#### Phase 3: Foreign Key Constraints hinzufügen
```sql
-- Nachdem Code deployed ist und funktioniert:
ALTER TABLE walletTransactions ADD CONSTRAINT fk_wallet_tx_subscription ...;
ALTER TABLE subscriptions ADD CONSTRAINT fk_subscription_wallet_tx ...;
```

**Risiko:** ⚠️ MITTEL - Constraints können fehlschlagen wenn Daten inkonsistent

---

### 🔄 **Rollback-Plan**

Falls etwas schief geht:

```sql
-- Rollback Phase 3: Foreign Keys entfernen
ALTER TABLE walletTransactions DROP FOREIGN KEY fk_wallet_tx_subscription;
ALTER TABLE subscriptions DROP FOREIGN KEY fk_subscription_wallet_tx;

-- Rollback Phase 2: Status zurücksetzen
UPDATE subscriptions SET status = 'pending' WHERE status = 'pending_approval';

-- Rollback Phase 1: Neue Spalten entfernen (nur wenn kritisch)
ALTER TABLE wallets DROP COLUMN stripeCustomerId;
ALTER TABLE wallets DROP COLUMN lastDepositAt;
-- etc.
```

**WICHTIG:** Rollback nur wenn System komplett kaputt! Datenverlust möglich bei DROP COLUMN.

---

## 4. BACKEND ÄNDERUNGEN

### 🆕 **Neuer Service: wallet-service.ts**

**Datei:** `server/services/wallet-service.ts`

```typescript
// Funktionen:

✅ getOrCreateWallet(userId: number, currency: string, currencyType: 'fiat' | 'crypto')
   → Gibt existierendes Wallet zurück oder erstellt neues
   → Setzt stripeCustomerId wenn nicht vorhanden (createStripeCustomer)

✅ createStripeCustomer(userId: number)
   → Erstellt Stripe Customer mit User Email + Name
   → Speichert stripeCustomerId in wallets Tabelle
   → Gibt Customer ID zurück

✅ creditWallet(walletId: number, amount: number, type: string, metadata: object)
   → Erhöht Wallet Balance
   → Erstellt walletTransaction (type=credit, status=completed)
   → Aktualisiert totalDeposited
   → Returns transaction ID

✅ debitWallet(walletId: number, amount: number, type: string, metadata: object)
   → Validiert: availableBalance >= amount
   → Reduziert balance UND availableBalance
   → Erstellt walletTransaction (type=debit, status=completed)
   → Throws Error wenn nicht genug Guthaben
   → Returns transaction ID

✅ reserveBalance(walletId: number, amount: number, subscriptionId: number)
   → Sperrt Betrag für Subscription
   → balance bleibt gleich, availableBalance -= amount
   → Erstellt walletTransaction (type=investment_debit, status=pending)
   → Returns transaction ID

✅ releaseReservedBalance(walletId: number, transactionId: number)
   → Gibt gesperrten Betrag frei (bei Ablehnung)
   → availableBalance += amount
   → walletTransaction status = cancelled

✅ confirmReservedBalance(walletId: number, transactionId: number)
   → Bestätigt Sperrung (bei Genehmigung)
   → balance -= amount (jetzt wirklich abgebucht)
   → walletTransaction status = completed

✅ calculateAvailableBalance(walletId: number)
   → Berechnet: balance - SUM(pending transactions)
   → Returns verfügbarer Betrag
```

---

### 🆕 **Neuer Service: penalty-calculator.ts**

**Datei:** `server/services/penalty-calculator.ts`

```typescript
// Funktionen:

✅ calculateEarlyWithdrawalPenalty(subscription: Subscription, bond: Bond)
   → Input: subscription amount, penalty rate (default 20%)
   → Output: {
       investmentAmount: 100000,
       penaltyRate: 0.20,
       penaltyAmount: 20000,
       payoutAmount: 80000,
       monthsHeld: 12,
       totalMonths: 60,
       completionPercentage: 20
     }
   → Kann später erweitert werden für gestaffelte Penalties (z.B. nach 6 Monaten nur 15%)

✅ validateEarlyWithdrawal(subscription: Subscription)
   → Prüft ob early withdrawal erlaubt ist:
     • subscription.status = 'active'
     • Minimum holding period erreicht? (z.B. 3 Monate)
     • Nicht bereits beantragt
   → Returns { allowed: boolean, reason?: string }
```

---

### 🆕 **Neue tRPC Endpoints**

#### **wallet Router Erweiterungen**

```typescript
// Datei: server/routers.ts → wallet router

✅ depositWithStripe({ amount: number, currency: string })
   → protectedProcedure
   → Validierung: amount >= 1000 (Minimum €1,000)
   → Erstellt/Holt Wallet
   → Erstellt Stripe Customer falls nötig
   → Erstellt Stripe Checkout Session:
     • mode: 'payment'
     • line_items: [{ price_data: { currency, unit_amount: amount * 100 }, quantity: 1 }]
     • success_url: /payment/deposit-success?session_id={CHECKOUT_SESSION_ID}
     • cancel_url: /payment/deposit-cancelled
     • metadata: { userId, walletId, type: 'wallet_deposit' }
   → Returns { sessionId, sessionUrl }

✅ getDepositHistory({ limit: number, offset: number })
   → protectedProcedure
   → Returns alle deposit transactions (type=deposit oder type=credit)
   → Sortiert nach createdAt DESC
   → Paginiert

✅ getBalanceSummary()
   → protectedProcedure
   → Returns {
       totalBalance: number,
       availableBalance: number,
       reservedBalance: number,
       totalDeposited: number,
       totalWithdrawn: number,
       totalInvested: number
     }
```

---

#### **subscriptions Router Erweiterungen**

```typescript
// Datei: server/routers.ts → subscriptions router

🔧 create({ bondId, amount, ... }) → MODIFIZIERT
   → protectedProcedure
   → NEUE Validierung:
     1. KYC verified (existing)
     2. Risk Profile (existing)
     3. ✅ Wallet Balance Check:
        const wallet = await getOrCreateWallet(userId, 'EUR', 'fiat');
        const available = await calculateAvailableBalance(wallet.id);
        if (available < parseFloat(amount)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Insufficient funds. Available: €${available}, Required: €${amount}`
          });
        }
   → NEUER Flow:
     1. Erstellt Subscription (status='pending_approval', paymentStatus='pending')
     2. Ruft reserveBalance() auf (Geld sperren)
     3. Speichert walletTransactionId in subscription
     4. Returns { id, requiresApproval: true }

✅ approveSubscription({ id: number, notes?: string })
   → adminProcedure (NEU)
   → Validierung: subscription.status = 'pending_approval'
   → Flow:
     1. Holt subscription + walletTransaction
     2. Ruft confirmReservedBalance() auf
     3. subscription.status = 'active'
     4. subscription.paymentStatus = 'completed'
     5. subscription.approvedBy = ctx.user.id
     6. subscription.approvedAt = NOW()
     7. Erstellt paymentSchedule entries (Zinszahlungen)
     8. Erstellt auditLog
     9. (Optional) Sendet Email an Investor
   → Returns { success: true }

✅ rejectSubscription({ id: number, reason: string })
   → adminProcedure (NEU)
   → Validierung: subscription.status = 'pending_approval'
   → Flow:
     1. Holt subscription + walletTransaction
     2. Ruft releaseReservedBalance() auf (Geld freigeben)
     3. subscription.status = 'rejected'
     4. subscription.rejectedBy = ctx.user.id
     5. subscription.rejectedAt = NOW()
     6. subscription.rejectionReason = reason
     7. Erstellt auditLog
     8. (Optional) Sendet Email an Investor
   → Returns { success: true }

✅ requestEarlyWithdrawal({ subscriptionId: number, password: string })
   → protectedProcedure (NEU)
   → Validierung:
     1. Subscription gehört zu User
     2. validateEarlyWithdrawal() returns allowed=true
     3. Password korrekt (optional, for extra security)
   → Flow:
     1. subscription.status = 'early_withdrawal_requested'
     2. subscription.earlyWithdrawalRequestedAt = NOW()
     3. Erstellt auditLog
     4. (Optional) Sendet Notification an Admin
   → Returns {
       success: true,
       estimatedPayout: calculateEarlyWithdrawalPenalty(...).payoutAmount
     }

✅ approveEarlyWithdrawal({ subscriptionId: number })
   → adminProcedure (NEU)
   → Validierung: subscription.status = 'early_withdrawal_requested'
   → Flow:
     1. Berechnet Penalty: calculateEarlyWithdrawalPenalty()
     2. Erstellt walletTransaction (type='penalty_deduction', amount=-penaltyAmount)
     3. Erstellt walletTransaction (type='early_withdrawal_credit', amount=payoutAmount)
     4. Credit wallet: creditWallet(walletId, payoutAmount, ...)
     5. subscription.status = 'early_withdrawal_completed'
     6. subscription.earlyWithdrawalApprovedAt = NOW()
     7. Storniert alle zukünftigen paymentSchedules für diese subscription
     8. Erstellt auditLog
     9. (Optional) Sendet Email an Investor
   → Returns { success: true, payoutAmount }

✅ getPendingApprovals()
   → adminProcedure (NEU)
   → Returns alle subscriptions mit status='pending_approval'
   → Joined mit user + bond + wallet data
   → Sortiert nach createdAt ASC (oldest first)

✅ getEarlyWithdrawalRequests()
   → adminProcedure (NEU)
   → Returns alle subscriptions mit status='early_withdrawal_requested'
   → Joined mit user + bond data
   → Zeigt berechnete penalty an
```

---

### 🆕 **Neue Express Endpoints**

#### **Stripe Checkout Webhook**

```typescript
// Datei: server/webhooks/stripe-checkout.ts (NEU)

POST /api/webhooks/stripe/checkout
   → Raw body required (Stripe signature verification)
   → Event: checkout.session.completed
   → Flow:
     1. Verify Stripe signature
     2. Extract metadata: { userId, walletId, type: 'wallet_deposit' }
     3. Holt Checkout Session Details von Stripe API
     4. amount_total / 100 = deposit amount
     5. payment_intent ID holen
     6. creditWallet(walletId, amount, 'deposit', {
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: session.payment_intent
        })
     7. Update wallet.lastDepositAt = NOW()
     8. Update wallet.totalDeposited += amount
     9. Erstellt auditLog
    10. (Optional) Sendet Email an User "Einzahlung erfolgreich"
   → Returns 200 OK zu Stripe

   → Event: checkout.session.expired (optional)
     • Transaction als "cancelled" markieren
```

---

### 🔧 **Modifizierte Endpoints**

#### **payments Router**

```typescript
// Datei: server/routers.ts → payments router

🔧 create({ subscriptionId, dueDate, amount, type }) → BLEIBT GLEICH
   → Admin erstellt payment schedule manually
   → Keine Änderungen nötig (funktioniert weiterhin)

🔧 markPaid({ id, transactionId? }) → ERWEITERT
   → Admin markiert scheduled payment als paid
   → NEU: Erstellt automatisch walletTransaction (type=credit)
   → Credited Wallet Balance automatisch
   → Alte Behavior: Nur status update → Neue: Wallet Credit + Status
```

---

## 5. FRONTEND ÄNDERUNGEN

### 🆕 **Neue Komponenten**

#### **StripeDepositDialog.tsx**

**Datei:** `client/src/components/wallet/StripeDepositDialog.tsx`

**Props:**
```typescript
{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet: Wallet;
}
```

**Features:**
- Input Feld für Betrag (min. €1,000)
- Währung Selector (EUR, USD - später)
- Zeigt Gebühren an: "Stripe Fee: 1.5% + €0.25 = €15.25"
- "Sie erhalten: €984.75" (nach Abzug Gebühren)
- Button "Mit Kreditkarte zahlen"
- onClick:
  - `depositWithStripe.mutate({ amount, currency })`
  - Erhält { sessionId, sessionUrl }
  - `window.location.href = sessionUrl` (redirect zu Stripe)

---

#### **EarlyWithdrawalDialog.tsx**

**Datei:** `client/src/components/subscription/EarlyWithdrawalDialog.tsx`

**Props:**
```typescript
{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: Subscription;
  bond: Bond;
}
```

**Features:**
- Zeigt Investment Details:
  - Investierter Betrag: €100,000
  - Laufzeit: 12/60 Monate (20%)
  - Zinsen erhalten: €5,500 (aus paymentSchedules)
- Penalty-Berechnung Preview:
  - Penalty: 20% von €100,000 = €20,000
  - Sie erhalten: €80,000
- ⚠️ Große rote Warning Box:
  "WARNUNG: Vorzeitige Auszahlung nicht reversibel!
   Sie verlieren €20,000 (20% Penalty).
   Sind Sie sicher?"
- Password Eingabe (extra Sicherheit)
- Checkbox: "Ich verstehe die Konsequenzen"
- Button "Vorzeitige Auszahlung beantragen" (disabled bis checkbox + password)
- onClick:
  - `requestEarlyWithdrawal.mutate({ subscriptionId, password })`
  - Success: "Antrag eingereicht. Admin wird prüfen."
  - Dialog schließt

---

#### **SubscriptionApprovalCard.tsx**

**Datei:** `client/src/components/admin/SubscriptionApprovalCard.tsx`

**Props:**
```typescript
{
  subscription: Subscription & { user: User; bond: Bond; wallet: Wallet };
  onApprove: () => void;
  onReject: (reason: string) => void;
}
```

**Features:**
- Zeigt Subscription Details:
  - Investor: Name + Email + ID
  - Bond: Name + Interest Rate
  - Betrag: €100,000
  - Wallet Balance VORHER: €105,000
  - Wallet Balance NACHHER: €5,000
  - KYC Status: ✅ Verified
  - Risk Profile: ✅ Risk Seeking
- Timeline:
  - Erstellt: 2026-01-24 14:30
  - Balance reserviert: 2026-01-24 14:30
- Zwei Buttons:
  - ✅ "Genehmigen" (grün)
  - ❌ "Ablehnen" (rot, öffnet Dialog für Grund)
- Bei Ablehnung: Dialog mit Textarea "Grund für Ablehnung"

---

#### **Success/Cancel Pages**

**Datei:** `client/src/pages/payment/DepositSuccess.tsx`

**Features:**
- URL: `/payment/deposit-success?session_id={CHECKOUT_SESSION_ID}`
- Holt session_id aus URL
- Zeigt Success Animation (Checkmark)
- "Einzahlung erfolgreich!"
- "Ihr Wallet wird in wenigen Sekunden aktualisiert."
- Zeigt Betrag an (aus session data)
- Button "Zum Wallet" → /investor/wallet
- Automatischer redirect nach 5 Sekunden

**Datei:** `client/src/pages/payment/DepositCancelled.tsx`

**Features:**
- URL: `/payment/deposit-cancelled`
- Zeigt Info Icon
- "Einzahlung abgebrochen"
- "Sie haben den Zahlungsvorgang abgebrochen."
- Button "Zurück zum Wallet" → /investor/wallet

---

### 🔧 **Modifizierte Komponenten**

#### **Wallet.tsx**

**Änderungen:**
- ✅ Neuer Button: "Mit Kreditkarte einzahlen"
  - Öffnet `<StripeDepositDialog />`
- ✅ Neuer Tab: "Einzahlungshistorie"
  - Zeigt nur deposits/credits (filtered)
  - Zeigt Stripe Transaction Details (wenn vorhanden)
- ✅ Balance Display erweitert:
  - Gesamtguthaben: €10,000
  - Verfügbar: €8,000 (grün)
  - Reserviert: €2,000 (gelb) - für pending subscriptions
- ✅ Bessere Deposit Info:
  - Statt hardcoded Bank Details:
  - "Einzahlung per Banküberweisung" (Collapsible Section)
  - "Einzahlung per Kreditkarte" (Button → Stripe)

---

#### **Subscribe.tsx**

**Änderungen:**
- 🔧 Schritt 1: Betrag Eingabe
  - ✅ NEU: Real-time Wallet Balance Check
  - Zeigt über Input:
    ```
    Verfügbares Guthaben: €10,000
    Investitionsbetrag: €15,000
    ❌ Unzureichendes Guthaben: €5,000 fehlen

    [Button: "Wallet aufladen"] → öffnet StripeDepositDialog
    ```
  - Submit Button disabled wenn nicht genug Guthaben

- 🔧 Schritt 2: Compliance Checkboxen (BLEIBT GLEICH)

- 🔧 Schritt 3: Zusammenfassung
  - ✅ NEU: Zeigt Wallet-Debit Preview:
    ```
    Wallet Balance vorher: €10,000.00
    Investitionsbetrag:    - €5,000.00
    Wallet Balance nachher: €5,000.00

    ℹ️ Betrag wird nach Admin-Genehmigung endgültig abgebucht.
    Bis dahin ist er reserviert und nicht verfügbar.
    ```

- 🔧 Success Message
  - ALT: "Zeichnung erfolgreich! Zahlung ausstehend."
  - NEU: "Zeichnung eingereicht! Betrag wurde reserviert.
          Ein Admin wird Ihre Investition in Kürze prüfen.
          Sie erhalten eine Email nach Genehmigung."
  - Redirect: `/investor/investments` (zeigt pending_approval status)

---

#### **MyInvestments.tsx**

**Änderungen:**
- ✅ Neue Status Badge: "Wartend auf Genehmigung" (gelb)
- ✅ Neue Status Badge: "Abgelehnt" (rot)
- ✅ Neue Action: "Vorzeitig auszahlen" Button
  - Nur sichtbar wenn subscription.status = 'active'
  - Öffnet `<EarlyWithdrawalDialog />`
- ✅ Zeigt Warning wenn early_withdrawal_requested:
  - "⏳ Vorzeitige Auszahlung beantragt. Admin prüft..."
  - Zeigt geschätzte Auszahlung: "Sie erhalten ca. €80,000"

---

#### **Admin: Investors.tsx oder neue Seite**

**Neue Admin-Seite:** `client/src/pages/admin/SubscriptionApproval.tsx`

**Features:**
- Liste aller pending_approval subscriptions
- Tabs:
  - "Zu genehmigen" (pending_approval)
  - "Vorzeitige Auszahlungen" (early_withdrawal_requested)
- Für jede Subscription:
  - `<SubscriptionApprovalCard />` Component
- Statistics:
  - X Subscriptions warten auf Genehmigung
  - Total Volumen: €XXX,XXX
  - Y Vorzeitige Auszahlungen beantragt

---

### 📊 **User Flow Diagramme**

#### Flow 1: Wallet Deposit via Stripe

```
┌─────────────┐
│   User      │
│  /wallet    │
└──────┬──────┘
       │
       ├─> Klick "Mit Kreditkarte einzahlen"
       │
┌──────▼──────────────────────────────┐
│  StripeDepositDialog öffnet         │
│  - Betrag eingeben: €5,000          │
│  - Zeigt Fee: €75.25                │
│  - Zeigt "Sie erhalten: €4,924.75"  │
└──────┬──────────────────────────────┘
       │
       ├─> Klick "Mit Kreditkarte zahlen"
       │
┌──────▼────────────────────────────────┐
│  Frontend: depositWithStripe.mutate() │
│  → Backend: tRPC wallet.deposit()     │
│  → Stripe: Create Checkout Session    │
│  → Returns: { sessionUrl }            │
└──────┬────────────────────────────────┘
       │
       ├─> window.location.href = sessionUrl
       │
┌──────▼────────────────────────┐
│  Stripe Hosted Checkout Page  │
│  - User gibt Kreditkarte ein  │
│  - Zahlt €5,000               │
│  - Success!                   │
└──────┬────────────────────────┘
       │
       ├─> checkout.session.completed webhook → Backend
       │
┌──────▼───────────────────────────────┐
│  Backend Webhook Handler             │
│  1. Verify Signature                 │
│  2. Extract userId, walletId         │
│  3. creditWallet(€4,924.75)          │
│  4. Create walletTransaction         │
│  5. Update wallet.totalDeposited     │
│  6. Send Email (optional)            │
└──────┬───────────────────────────────┘
       │
       ├─> User redirect: /payment/deposit-success
       │
┌──────▼─────────────────────────────┐
│  DepositSuccess Page               │
│  - "Einzahlung erfolgreich!"       │
│  - "Wallet wird aktualisiert..."   │
│  - Auto-redirect nach 5 Sek        │
└──────┬─────────────────────────────┘
       │
       └─> /investor/wallet
           → Balance zeigt €4,924.75
```

---

#### Flow 2: Investment aus Wallet (mit Admin Approval)

```
┌─────────────┐
│   User      │
│  /investor  │
└──────┬──────┘
       │
       ├─> Browse Bonds → Wählt Bond → /investor/subscribe/:id
       │
┌──────▼─────────────────────────────────┐
│  Subscribe Page                        │
│  1. Check: KYC ✅ + Risk Profile ✅    │
│  2. Eingabe: €100,000                  │
│  3. Check: Wallet Balance ✅ €150,000  │
│  4. Alle 12 Checkboxen ✅              │
└──────┬─────────────────────────────────┘
       │
       ├─> Klick "Jetzt investieren"
       │
┌──────▼─────────────────────────────────┐
│  Frontend: subscriptions.create()      │
│  → Backend: tRPC subscriptions.create()│
│  → Validierung: Balance check          │
│  → reserveBalance(walletId, €100k)     │
│     • balance bleibt €150k             │
│     • availableBalance = €50k          │
│     • walletTx (pending)               │
│  → subscription (pending_approval)     │
│  → Returns: { id, requiresApproval }   │
└──────┬─────────────────────────────────┘
       │
       ├─> Success Message
       │   "Betrag reserviert. Admin prüft in Kürze."
       │
┌──────▼───────────────────────────┐
│  /investor/investments           │
│  → Zeigt Subscription:           │
│    Status: ⏳ "Wartend"          │
│    Betrag: €100,000              │
│    Bond: Swiss Corporate 5.5%    │
└──────────────────────────────────┘


┌─────────────┐
│   Admin     │
│  /admin     │
└──────┬──────┘
       │
       ├─> /admin/subscription-approval
       │
┌──────▼───────────────────────────────────┐
│  SubscriptionApprovalCard                │
│  - Investor: Max Mustermann              │
│  - Betrag: €100,000                      │
│  - Wallet: €150k → €50k                  │
│  - KYC: ✅ | Risk: ✅                    │
│  [✅ Genehmigen] [❌ Ablehnen]           │
└──────┬───────────────────────────────────┘
       │
       ├─> Admin klickt "Genehmigen"
       │
┌──────▼────────────────────────────────────┐
│  Backend: approveSubscription()           │
│  1. confirmReservedBalance()              │
│     → wallet.balance = €50k (abgebucht!)  │
│     → walletTx status = completed         │
│  2. subscription.status = active          │
│  3. subscription.paymentStatus = completed│
│  4. Create paymentSchedules (Zinsen)     │
│  5. auditLog erstellen                    │
│  6. Email an Investor senden              │
└──────┬────────────────────────────────────┘
       │
       ├─> Investor erhält Email:
       │   "Ihre Investition wurde genehmigt!"
       │
┌──────▼───────────────────────────────┐
│  Investor /investor/investments      │
│  → Status: ✅ "Aktiv"                │
│  → Zinszahlungen scheduled            │
│  → Button: "Vorzeitig auszahlen"     │
└──────────────────────────────────────┘
```

---

#### Flow 3: Early Withdrawal (mit 20% Penalty)

```
┌─────────────┐
│   User      │
│  /investor/ │
│  investments│
└──────┬──────┘
       │
       ├─> Klick "Vorzeitig auszahlen" bei aktiver Subscription
       │
┌──────▼──────────────────────────────────┐
│  EarlyWithdrawalDialog öffnet           │
│  - Investment: €100,000                 │
│  - Laufzeit: 12/60 Monate (20%)         │
│  - Erhaltene Zinsen: €5,500             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━          │
│  ⚠️ PENALTY BERECHNUNG:                 │
│  - Penalty: 20% × €100,000 = €20,000    │
│  - Sie erhalten: €80,000                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━          │
│  ⚠️ Diese Aktion ist NICHT reversibel!  │
│                                         │
│  [ ] Ich verstehe die Konsequenzen     │
│  Password: [________]                   │
│  [Button: "Auszahlung beantragen"]      │
└──────┬──────────────────────────────────┘
       │
       ├─> User gibt Password ein + Checkbox
       ├─> Klick "Auszahlung beantragen"
       │
┌──────▼────────────────────────────────────┐
│  Frontend: requestEarlyWithdrawal()       │
│  → Backend: tRPC subscription.request...()│
│  → Validierung:                           │
│    • subscription.status = 'active' ✅    │
│    • User ist Owner ✅                    │
│    • Password korrekt ✅                  │
│  → subscription.status =                  │
│    'early_withdrawal_requested'           │
│  → subscription.earlyWithdrawalRequestedAt│
│  → auditLog erstellen                     │
│  → Notification an Admin                  │
│  → Returns: { success, estimatedPayout }  │
└──────┬────────────────────────────────────┘
       │
       ├─> Success Message:
       │   "Antrag eingereicht. Admin prüft in Kürze.
       │    Geschätzte Auszahlung: €80,000"
       │
┌──────▼───────────────────────────────┐
│  /investor/investments               │
│  → Status: ⏳ "Vorzeitige Auszahlung │
│             beantragt"               │
│  → Info: "Sie erhalten ca. €80k"    │
└──────────────────────────────────────┘


┌─────────────┐
│   Admin     │
│  /admin     │
└──────┬──────┘
       │
       ├─> /admin/subscription-approval → Tab "Vorzeitige Auszahlungen"
       │
┌──────▼───────────────────────────────────┐
│  Early Withdrawal Approval Card          │
│  - Investor: Max Mustermann              │
│  - Investment: €100,000                  │
│  - Laufzeit: 12/60 Monate                │
│  - Penalty: €20,000 (20%)                │
│  - Auszahlung: €80,000                   │
│  [✅ Genehmigen und auszahlen]           │
└──────┬───────────────────────────────────┘
       │
       ├─> Admin klickt "Genehmigen"
       │
┌──────▼────────────────────────────────────┐
│  Backend: approveEarlyWithdrawal()        │
│  1. calculateEarlyWithdrawalPenalty()     │
│  2. Create walletTx: penalty_deduction    │
│     → amount: -€20,000                    │
│  3. Create walletTx: early_withdrawal...  │
│     → amount: +€80,000                    │
│  4. creditWallet(walletId, €80,000)       │
│     → wallet.balance += €80,000           │
│  5. subscription.status =                 │
│     'early_withdrawal_completed'          │
│  6. Cancel future paymentSchedules        │
│  7. auditLog erstellen                    │
│  8. Email an Investor                     │
└──────┬────────────────────────────────────┘
       │
       ├─> Investor erhält Email:
       │   "Vorzeitige Auszahlung genehmigt!
       │    €80,000 wurden Ihrem Wallet gutgeschrieben."
       │
┌──────▼───────────────────────────────┐
│  Investor /investor/wallet           │
│  → Balance: +€80,000                 │
│  → Transaction: "Early Withdrawal"   │
│  → Can now request withdrawal to bank│
└──────────────────────────────────────┘
```

---

## 6. STRIPE INTEGRATION

### 💳 **Stripe Checkout Session für Wallet-Einzahlung**

#### **Workflow:**

1. **User initiiert Deposit:**
   - Frontend: User klickt "Mit Kreditkarte einzahlen"
   - Frontend: `depositWithStripe.mutate({ amount: 5000, currency: 'EUR' })`

2. **Backend erstellt Checkout Session:**
   ```typescript
   const session = await stripe.checkout.sessions.create({
     mode: 'payment',
     payment_method_types: ['card', 'sepa_debit'], // Unterstützte Methoden
     line_items: [
       {
         price_data: {
           currency: 'eur',
           product_data: {
             name: 'Wallet Einzahlung',
             description: `Einzahlung für Angelus Wallet (User ID: ${userId})`,
           },
           unit_amount: amount * 100, // €5000 → 500000 cents
         },
         quantity: 1,
       },
     ],
     customer: stripeCustomerId, // Aus wallet.stripeCustomerId
     client_reference_id: userId.toString(),
     metadata: {
       userId: userId.toString(),
       walletId: wallet.id.toString(),
       type: 'wallet_deposit',
       currency: 'EUR',
     },
     success_url: `${baseUrl}/payment/deposit-success?session_id={CHECKOUT_SESSION_ID}`,
     cancel_url: `${baseUrl}/payment/deposit-cancelled`,
     locale: 'de', // German checkout page
   });

   return { sessionId: session.id, sessionUrl: session.url };
   ```

3. **User zahlt auf Stripe:**
   - Browser redirect zu `session.url`
   - Stripe Hosted Checkout Page
   - User gibt Kreditkartendaten ein
   - Stripe processed Payment

4. **Webhook empfängt Event:**
   ```typescript
   // Event: checkout.session.completed
   const session = event.data.object;
   const { userId, walletId } = session.metadata;

   const amount = session.amount_total / 100; // cents → EUR

   await creditWallet(walletId, amount, 'deposit', {
     stripeCheckoutSessionId: session.id,
     stripePaymentIntentId: session.payment_intent,
   });
   ```

5. **User redirect zurück:**
   - Success: `/payment/deposit-success?session_id=cs_xxx`
   - Cancel: `/payment/deposit-cancelled`

---

### 🔑 **Stripe API Methoden**

#### **Verwendete Stripe APIs:**

1. **`stripe.customers.create()`**
   - Wann: Beim ersten Wallet-Create für User
   - Parameter:
     ```typescript
     {
       email: user.email,
       name: user.name,
       metadata: {
         userId: user.id,
         kycStatus: user.kycStatus,
       }
     }
     ```
   - Returns: Customer ID (speichern in wallet.stripeCustomerId)

2. **`stripe.customers.retrieve(customerId)`**
   - Wann: Vor jedem Checkout (um Customer zu validieren)
   - Returns: Customer Object

3. **`stripe.checkout.sessions.create()`**
   - Wann: Bei Wallet Deposit
   - Parameter: siehe oben (Workflow)
   - Returns: Session Object mit `.url`

4. **`stripe.checkout.sessions.retrieve(sessionId)`**
   - Wann: In Success Page (optional, um Details anzuzeigen)
   - Parameter: sessionId aus URL
   - Returns: Session mit amount, status, etc.

5. **`stripe.paymentIntents.retrieve(paymentIntentId)`**
   - Wann: In Webhook (um Details zu holen)
   - Returns: PaymentIntent mit Fees, Net Amount, etc.

6. **`stripe.webhooks.constructEvent(payload, signature, secret)`**
   - Wann: Jeder Webhook Request
   - Validiert Signature
   - Returns: Verified Event Object

---

### 📡 **Webhook Events**

#### **Primäres Event: checkout.session.completed**

```json
{
  "id": "evt_xxx",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_xxx",
      "object": "checkout.session",
      "amount_total": 500000,
      "currency": "eur",
      "customer": "cus_xxx",
      "payment_intent": "pi_xxx",
      "payment_status": "paid",
      "metadata": {
        "userId": "123",
        "walletId": "456",
        "type": "wallet_deposit",
        "currency": "EUR"
      }
    }
  }
}
```

**Handler Flow:**
1. Verify signature
2. Extract metadata (userId, walletId)
3. Get amount: amount_total / 100
4. Credit wallet
5. Create walletTransaction
6. Update wallet stats
7. Send email (optional)
8. Return 200 OK

---

#### **Sekundäres Event: checkout.session.expired** (optional)

Falls User nicht zahlt innerhalb 24h:

```json
{
  "type": "checkout.session.expired",
  "data": {
    "object": {
      "id": "cs_xxx",
      "payment_status": "unpaid",
      "metadata": { ... }
    }
  }
}
```

**Handler Flow:**
1. Log expired session (for analytics)
2. Optionally: Send reminder email
3. Return 200 OK

---

### 🔗 **Success/Cancel URL Handling**

#### **Success URL: `/payment/deposit-success?session_id={CHECKOUT_SESSION_ID}`**

**Frontend Logic:**
```typescript
// Extract session_id from URL
const searchParams = new URLSearchParams(window.location.search);
const sessionId = searchParams.get('session_id');

// Fetch session details (optional)
const sessionQuery = trpc.wallet.getDepositSessionDetails.useQuery(
  { sessionId },
  { enabled: !!sessionId }
);

// Show success message
// Auto-redirect after 5 seconds to /investor/wallet
useEffect(() => {
  const timer = setTimeout(() => {
    router.push('/investor/wallet');
  }, 5000);
  return () => clearTimeout(timer);
}, []);
```

**Backend Endpoint (optional):**
```typescript
getDepositSessionDetails({ sessionId })
  → Calls stripe.checkout.sessions.retrieve(sessionId)
  → Returns { amount, status, created }
  → Used to display exact amount on success page
```

---

#### **Cancel URL: `/payment/deposit-cancelled`**

**Frontend Logic:**
- Simpler: Just static page
- "Sie haben die Zahlung abgebrochen."
- Button "Zurück zum Wallet"
- No API call needed

---

### 👤 **Stripe Customer ID Verknüpfung mit User**

#### **Wann wird Customer erstellt?**

**Option A: Beim ersten Wallet-Create (empfohlen)**
```typescript
async function getOrCreateWallet(userId, currency, currencyType) {
  let wallet = await db.getWallet(userId, currency);

  if (!wallet) {
    // Create Stripe Customer
    const user = await db.getUserById(userId);
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id }
    });

    // Create Wallet with stripeCustomerId
    wallet = await db.createWallet({
      userId,
      currency,
      currencyType,
      stripeCustomerId: customer.id
    });
  }

  return wallet;
}
```

**Option B: Beim ersten Deposit (lazy)**
- Nur Customer erstellen wenn User wirklich Stripe nutzt
- Spart Stripe API calls
- Aber: Komplizierter weil dann in depositWithStripe() check nötig

**Empfehlung:** Option A (beim Wallet-Create)

---

#### **Customer Metadata:**

Speichere zusätzliche Infos im Stripe Customer:

```typescript
{
  metadata: {
    userId: '123',
    userEmail: 'investor@example.com',
    kycStatus: 'verified',
    investorType: 'professional',
    createdAt: '2026-01-24T12:00:00Z',
  }
}
```

**Vorteile:**
- Einfaches Tracking in Stripe Dashboard
- Kann für Fraud Detection genutzt werden
- Bei Disputes: Sofort User-Info sichtbar

---

### 💰 **Unterstützte Zahlungsmethoden**

#### **payment_method_types Array:**

```typescript
payment_method_types: [
  'card',           // Kreditkarte, Debitkarte (Visa, Mastercard, Amex)
  'sepa_debit',     // SEPA Lastschrift (EU)
]
```

**Optional (aktivieren wenn gewünscht):**
```typescript
payment_method_types: [
  'card',
  'sepa_debit',
  'sofort',         // Sofort/Klarna (Deutschland)
  'giropay',        // Giropay (Deutschland)
  'ideal',          // iDEAL (Niederlande)
  'bancontact',     // Bancontact (Belgien)
]
```

**Empfehlung Start:** Nur `card` und `sepa_debit`
- Einfacher
- Niedrigere Fees für SEPA
- Später erweitern nach Bedarf

---

### 💸 **Stripe Fees Handling**

#### **Stripe Pricing (Stand 2026):**

**Kreditkarte (European Cards):**
- Fee: **1.5% + €0.25** per transaction
- Beispiel: €5,000 → Fee = €75.25

**SEPA Direct Debit:**
- Fee: **0.8% (capped at €5)**
- Beispiel: €5,000 → Fee = €5.00 (viel günstiger!)

---

#### **Wer zahlt die Fees?**

**Option A: Investor zahlt (empfohlen)**

User zahlt €5,000, erhält €4,924.75 im Wallet.

**Frontend Berechnung:**
```typescript
const calculateNetAmount = (grossAmount: number, method: 'card' | 'sepa') => {
  if (method === 'card') {
    const fee = grossAmount * 0.015 + 0.25;
    return grossAmount - fee;
  } else if (method === 'sepa') {
    const fee = Math.min(grossAmount * 0.008, 5);
    return grossAmount - fee;
  }
};

// Display:
"Sie zahlen: €5,000.00
 Stripe Fee: €75.25
 Sie erhalten: €4,924.75"
```

**Webhook Handler:**
```typescript
// Stripe sendet net amount nach fees automatisch
const session = event.data.object;
const grossAmount = session.amount_total / 100;

// Option: Hol PaymentIntent für genaue Fee
const paymentIntent = await stripe.paymentIntents.retrieve(
  session.payment_intent
);
const feeAmount = paymentIntent.charges.data[0].balance_transaction.fee / 100;
const netAmount = grossAmount - feeAmount;

// Credit wallet mit net amount
await creditWallet(walletId, netAmount, ...);
```

---

**Option B: Platform zahlt**

User zahlt €5,000, erhält €5,000 im Wallet. Platform zahlt €75.25 Fee.

**Vorteile:**
- User-friendly
- Keine komplizierte Fee-Berechnung im Frontend

**Nachteile:**
- Kostet Platform Geld
- Bei großen Beträgen (€100k) = €1,500 Fee pro Transaction!

**Empfehlung:** Option A (Investor zahlt Fees)
- Fairer
- Skalierbar
- Transparent

---

## 7. RISIKO-ANALYSE

### ⚠️ **Was könnte schief gehen?**

#### **Risiko 1: Stripe Webhook wird NICHT empfangen**

**Szenario:**
- User zahlt €5,000 auf Stripe ✅
- Stripe webhook an Server fails ❌
- Wallet Balance wird NICHT credited ❌
- User beschwert sich: "Ich habe gezahlt aber kein Guthaben!"

**Wahrscheinlichkeit:** 🟡 MITTEL (2-5% der Webhooks können fehlschlagen)

**Auswirkung:** 🔴 HOCH (User hat gezahlt aber kein Guthaben)

**Mitigation Strategies:**

1. **Retry Mechanism (Stripe automatisch):**
   - Stripe versucht webhook automatisch mehrmals (bis zu 72h)
   - Wenn Server down: Stripe sendet wieder wenn online

2. **Manual Reconciliation (Admin Tool):**
   - Admin Page: "Fehlende Stripe Payments"
   - Button: "Sync von Stripe"
   - Holt alle payments der letzten 7 Tage von Stripe API
   - Vergleicht mit DB → Zeigt missing payments
   - Admin kann manuell crediten

3. **User Self-Service:**
   - In Wallet Page: "Zahlung fehlt?"
   - User gibt Stripe Payment Intent ID ein
   - System prüft bei Stripe → credited automatisch

4. **Monitoring:**
   - Alert wenn webhook nicht empfangen innerhalb 5 Minuten
   - Check: Stripe Dashboard → Event Logs

**Code-Beispiel: Manual Sync**
```typescript
// Admin Endpoint
syncMissingStripePayments({ startDate, endDate })
  → Holt alle checkout.sessions von Stripe
  → Filtert nach metadata.type='wallet_deposit'
  → Prüft ob walletTransaction existiert
  → Wenn nicht: Erstellt Transaction + credited Wallet
  → Returns: { synced: 5, alreadyProcessed: 120 }
```

---

#### **Risiko 2: Race Condition beim Subscription Approval**

**Szenario:**
- User hat €100k im Wallet
- User erstellt 2 Subscriptions gleichzeitig (à €60k)
- Beide reservieren Balance parallel
- Wallet availableBalance = -€20k (NEGATIV!)

**Wahrscheinlichkeit:** 🟡 MITTEL (wenn kein Locking)

**Auswirkung:** 🟡 MITTEL (Negative Balance, aber catchbar)

**Mitigation Strategies:**

1. **Database Transaction mit SELECT FOR UPDATE:**
   ```typescript
   async function reserveBalance(walletId, amount) {
     return db.transaction(async (trx) => {
       // Lock wallet row
       const wallet = await trx
         .select()
         .from(wallets)
         .where({ id: walletId })
         .forUpdate()
         .first();

       if (wallet.availableBalance < amount) {
         throw new Error('Insufficient funds');
       }

       // Update
       await trx
         .update(wallets)
         .set({
           availableBalance: wallet.availableBalance - amount
         })
         .where({ id: walletId });

       // Create transaction
       await trx.insert(walletTransactions).values({...});
     });
   }
   ```

2. **Application-Level Lock (Redis):**
   ```typescript
   const lock = await redis.lock(`wallet:${walletId}`, 5000);
   try {
     // Reserve balance
   } finally {
     await lock.release();
   }
   ```

3. **Validation im Frontend:**
   - Subscribe Button disabled während mutation läuft
   - Zeigt "Verarbeitung..." wenn pending

**Empfehlung:** Option 1 (DB Transaction) - Einfachste Lösung

---

#### **Risiko 3: Admin genehmigt Subscription, aber Wallet Update fails**

**Szenario:**
- Admin klickt "Genehmigen"
- subscription.status = 'active' ✅
- walletTransaction.status = 'completed' ✅
- wallet.balance -= 100000 ❌ (DB Error)
- Inkonsistenter State!

**Wahrscheinlichkeit:** 🟢 NIEDRIG (DB sollte robust sein)

**Auswirkung:** 🔴 HOCH (Subscription aktiv aber Geld nicht abgebucht)

**Mitigation Strategies:**

1. **Database Transaction (ALL OR NOTHING):**
   ```typescript
   async function approveSubscription(subscriptionId, adminId) {
     return db.transaction(async (trx) => {
       // 1. Update subscription
       await trx.update(subscriptions).set({
         status: 'active',
         approvedBy: adminId,
         approvedAt: new Date(),
       }).where({ id: subscriptionId });

       // 2. Update walletTransaction
       await trx.update(walletTransactions).set({
         status: 'completed',
       }).where({ id: txId });

       // 3. Update wallet
       await trx.update(wallets).set({
         balance: db.raw('balance - ?', [amount]),
       }).where({ id: walletId });

       // If ANY fails → ALL rollback automatically
     });
   }
   ```

2. **Audit Log für Inconsistencies:**
   - Daily Cron Job prüft:
     - Alle active subscriptions haben walletTransaction?
     - Wallet balance == SUM(transactions)?
   - Bei Mismatch: Alert an Admins

3. **Retry Mechanism:**
   - Wenn approveSubscription fails
   - Subscription bleibt 'pending_approval'
   - Admin kann retry
   - Idempotent (mehrfache Ausführung OK)

**Empfehlung:** Option 1 (DB Transaction) MUSS implementiert werden

---

#### **Risiko 4: User sendet Banküberweisung, Admin credited falsche Wallet**

**Szenario:**
- User A überweist €50k mit Verwendungszweck "User ID 123"
- Admin credited versehentlich Wallet von User B (ID 124)
- User A beschwert sich: "Wo ist mein Geld?"
- User B macht schnell Investment von €50k
- Geld nicht mehr recoverable

**Wahrscheinlichkeit:** 🟡 MITTEL (Human Error)

**Auswirkung:** 🔴 HOCH (Geld weg)

**Mitigation Strategies:**

1. **Confirmation Dialog bei Manual Credit:**
   ```
   ⚠️ WARNUNG: Wallet Credit

   User: Max Mustermann (ID: 123)
   Email: max@example.com
   Wallet: EUR
   Betrag: €50,000.00

   Bitte bestätigen Sie:
   [ ] Ich habe die Banküberweisung verifiziert
   [ ] Der User ID stimmt mit Verwendungszweck überein
   [ ] Der Betrag ist korrekt

   [Abbrechen] [✅ Bestätigen und crediten]
   ```

2. **Audit Log mit Bank Reference:**
   - Admin muss Bank Reference eingeben (IBAN, Transaction ID)
   - Speichern in walletTransaction.bankReference
   - Bei Disputes: Nachvollziehbar

3. **Double-Check System:**
   - Manual Credits > €10k require 2 admins
   - First admin creates "pending credit"
   - Second admin approves
   - Reduces error rate

4. **Automated IBAN Matching (später):**
   - User hinterlegt IBAN in Profil
   - System prüft eingehende Überweisungen
   - Auto-matching via IBAN + Betrag
   - Admin nur für Exceptions

**Empfehlung:** Option 1 + 2 (Confirmation + Audit Log)

---

#### **Risiko 5: Stripe Webhook Replay Attack**

**Szenario:**
- Attacker captured webhook request
- Replays webhook 10x
- Wallet wird 10x credited (€50k → €500k!)
- User zieht alles aus

**Wahrscheinlichkeit:** 🟢 NIEDRIG (wenn Signature verified)

**Auswirkung:** 🔴 HOCH (Major financial loss)

**Mitigation Strategies:**

1. **Stripe Signature Verification (MUSS):**
   ```typescript
   const event = stripe.webhooks.constructEvent(
     rawBody,
     signature,
     webhookSecret
   );
   // Throws error if invalid signature
   ```

2. **Idempotency Key:**
   ```typescript
   // Prüfe ob event.id schon processed
   const existing = await db.getWebhookEvent(event.id);
   if (existing) {
     console.log('Webhook already processed, skipping');
     return res.json({ received: true });
   }

   // Process webhook
   await processWebhook(event);

   // Save event.id
   await db.saveWebhookEvent(event.id);
   ```

3. **Stripe Checkout Session kann nur 1x paid sein:**
   - session.payment_status = 'paid'
   - Wenn session schon paid → Ignore duplicate webhook
   - Stripe API check:
     ```typescript
     const session = await stripe.checkout.sessions.retrieve(sessionId);
     if (session.payment_status !== 'paid') {
       throw new Error('Session not paid');
     }
     ```

**Empfehlung:** Alle 3 Layers implementieren (Defense in Depth)

---

### 🛡️ **Wie schützen wir bestehende Daten?**

#### **Schutz 1: Nur ADDITIVE Schema Changes**

- ✅ ADD COLUMN → Safe
- ✅ ADD INDEX → Safe
- ❌ DROP COLUMN → Dangerous!
- ❌ ALTER COLUMN → Dangerous!
- ❌ RENAME COLUMN → Dangerous!

**Rollout-Strategie:**
1. Phase 1: ADD columns (mit NULL oder DEFAULT)
2. Phase 2: Deploy code (nutzt alte + neue Felder)
3. Phase 3: Migrate data (fill new columns)
4. Phase 4: Deploy code (nutzt nur neue Felder)
5. Phase 5: DROP old columns (optional, nach Wochen)

---

#### **Schutz 2: Database Backups BEFORE Migration**

```bash
# Vor jeder Migration:
mysqldump -u root -p angelus_db > backup_2026-01-24_pre-wallet-migration.sql

# Testen auf Staging:
mysql -u root -p angelus_staging < wallet_migration.sql

# Verifizieren:
SELECT COUNT(*) FROM wallets; # Muss gleich bleiben
SELECT SUM(balance) FROM wallets; # Muss gleich bleiben

# Wenn OK → Production:
mysql -u root -p angelus_production < wallet_migration.sql
```

---

#### **Schutz 3: Feature Flags**

```typescript
// server/_core/feature-flags.ts
export const FEATURE_FLAGS = {
  STRIPE_WALLET_DEPOSIT: process.env.ENABLE_STRIPE_DEPOSIT === 'true',
  WALLET_BASED_INVESTMENT: process.env.ENABLE_WALLET_INVESTMENT === 'true',
  EARLY_WITHDRAWAL: process.env.ENABLE_EARLY_WITHDRAWAL === 'true',
};

// Usage:
if (FEATURE_FLAGS.STRIPE_WALLET_DEPOSIT) {
  // Show Stripe deposit button
} else {
  // Show only bank transfer
}
```

**Rollout Plan:**
- Week 1: Deploy code, flags OFF → Test on staging
- Week 2: Enable STRIPE_WALLET_DEPOSIT on production → Test deposits
- Week 3: Enable WALLET_BASED_INVESTMENT → Test subscriptions
- Week 4: Enable EARLY_WITHDRAWAL → Full feature live

---

### 🔄 **Rollback-Strategie**

#### **Scenario 1: Code-Bug nach Deployment**

**Symptom:** 500 errors, wrong calculations, etc.

**Rollback:**
```bash
# Git revert
git revert HEAD
git push origin main

# Railway auto-deploys previous version

# Database bleibt wie sie ist (neue Spalten bleiben)
# Alter Code ignoriert neue Spalten einfach (weil NULL)
```

**Dauer:** 5 minutes

---

#### **Scenario 2: Database Migration schief gegangen**

**Symptom:** Foreign Key Constraint fails, data corruption

**Rollback:**
```bash
# Restore from backup
mysql -u root -p angelus_db < backup_2026-01-24_pre-wallet-migration.sql

# Warnung: Alle Transactions seit Backup gehen verloren!
# Nur wenn KRITISCH (z.B. prod komplett down)
```

**Dauer:** 10-30 minutes (depending on DB size)

**Prevention:** Test migration auf Staging mit Production-Clone first!

---

#### **Scenario 3: Stripe Integration kaputt**

**Symptom:** Webhooks funktionieren nicht, deposits werden nicht credited

**Rollback:**
```typescript
// Feature Flag OFF
ENABLE_STRIPE_DEPOSIT=false

// Frontend zeigt nur noch:
"Einzahlung per Banküberweisung (manuell)"

// Users can still use platform, just no Stripe
```

**Dauer:** 1 minute (env variable change)

**Fix Strategy:**
- Debug Stripe webhook locally
- Check Stripe Dashboard → Event Logs
- Fix webhook handler
- Test auf Staging
- Re-enable feature flag

---

### 🚨 **Stripe Webhook Fehlerbehandlung**

#### **Fehler-Kategorien:**

**1. Transient Errors (Temporary):**
- Database connection timeout
- Redis unavailable
- External API down

**Handling:**
```typescript
try {
  await processWebhook(event);
} catch (error) {
  if (isTransientError(error)) {
    // Return 500 → Stripe retries
    console.error('Transient error, Stripe will retry:', error);
    return res.status(500).json({
      error: 'Temporary error, will retry'
    });
  }
  // ... permanent error handling
}
```

---

**2. Permanent Errors (Won't fix themselves):**
- Invalid metadata (userId not found)
- Wallet doesn't exist
- Amount is negative

**Handling:**
```typescript
if (isPermanentError(error)) {
  // Return 200 → Stripe stops retrying
  // But log to error tracking
  console.error('Permanent error, cannot process:', error);
  await logToSentry(error, event);
  await sendAlertToAdmin(event);

  return res.status(200).json({
    received: true,
    error: 'Cannot process, manual intervention required'
  });
}
```

---

**3. Duplicate Events:**
- Same webhook sent 2x (network hiccup)
- Already processed

**Handling:**
```typescript
// Check if already processed (idempotency)
const existingTx = await db.getWalletTransactionByStripeCheckoutSession(
  event.data.object.id
);

if (existingTx) {
  console.log('Webhook already processed:', event.id);
  return res.status(200).json({
    received: true,
    duplicate: true
  });
}

// Process normally...
```

---

#### **Monitoring & Alerting:**

**1. Webhook Success Rate:**
```typescript
// Metrics
webhookProcessed.inc({ status: 'success' });
webhookProcessed.inc({ status: 'failed' });

// Alert if success rate < 95% over 1 hour
```

**2. Webhook Processing Time:**
```typescript
const start = Date.now();
await processWebhook(event);
const duration = Date.now() - start;

webhookDuration.observe(duration);

// Alert if p95 > 5000ms (too slow)
```

**3. Missing Webhooks Detection:**
```typescript
// Cron job every 5 minutes
async function detectMissingWebhooks() {
  // Fetch recent checkout sessions from Stripe
  const sessions = await stripe.checkout.sessions.list({
    created: { gte: Date.now() / 1000 - 600 }, // Last 10 min
    limit: 100,
  });

  for (const session of sessions.data) {
    if (session.payment_status === 'paid') {
      // Check if we have walletTransaction
      const tx = await db.getWalletTransactionByStripeCheckoutSession(
        session.id
      );

      if (!tx) {
        // ALERT! Missing webhook
        await sendAlert(`Missing webhook for session ${session.id}`);
        // Optionally: Process automatically
      }
    }
  }
}
```

---

## 8. TEST-PLAN

### 🧪 **Stripe Test-Mode verwenden**

#### **Setup:**

1. **Stripe Test Keys:**
   ```env
   # .env.development
   STRIPE_SECRET_KEY=sk_test_51xxxxx
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx (von Stripe CLI oder Dashboard)
   ```

2. **Stripe CLI Installation:**
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe

   # Login
   stripe login

   # Forward webhooks zu localhost
   stripe listen --forward-to http://localhost:3000/api/webhooks/stripe/checkout

   # Output: whsec_xxx (webhook secret for local testing)
   ```

---

### 💳 **Test-Kreditkarten**

#### **Stripe Test Cards:**

| Kartennummer | Brand | Scenario |
|--------------|-------|----------|
| `4242 4242 4242 4242` | Visa | ✅ Success |
| `4000 0025 0000 3155` | Visa | ✅ 3D Secure (SCA) |
| `4000 0000 0000 9995` | Visa | ❌ Declined (insufficient funds) |
| `4000 0000 0000 0002` | Visa | ❌ Declined (generic) |
| `4000 0000 0000 0341` | Visa | ❌ Declined (lost card) |

**Test Details:**
- Expiry: Any future date (z.B. 12/34)
- CVC: Any 3 digits (z.B. 123)
- Postal Code: Any valid (z.B. 10115)

---

### 🧪 **Wie testen wir vor Go-Live?**

#### **Phase 1: Unit Tests (Backend)**

**Test:** `wallet-service.test.ts`

```typescript
describe('Wallet Service', () => {
  it('should credit wallet successfully', async () => {
    const wallet = await createTestWallet();
    const tx = await creditWallet(wallet.id, 1000, 'deposit', {});

    expect(tx.status).toBe('completed');
    expect(tx.amount).toBe('1000');

    const updatedWallet = await getWallet(wallet.id);
    expect(updatedWallet.balance).toBe('1000');
  });

  it('should reserve balance and reduce availableBalance', async () => {
    const wallet = await createTestWallet({ balance: 10000 });

    const tx = await reserveBalance(wallet.id, 5000, 123);

    const updatedWallet = await getWallet(wallet.id);
    expect(updatedWallet.balance).toBe('10000'); // Unchanged
    expect(updatedWallet.availableBalance).toBe('5000'); // Reduced
    expect(tx.status).toBe('pending');
  });

  it('should throw error if insufficient funds', async () => {
    const wallet = await createTestWallet({ balance: 1000 });

    await expect(
      reserveBalance(wallet.id, 5000, 123)
    ).rejects.toThrow('Insufficient funds');
  });
});
```

**Test:** `penalty-calculator.test.ts`

```typescript
describe('Penalty Calculator', () => {
  it('should calculate 20% penalty correctly', () => {
    const result = calculateEarlyWithdrawalPenalty({
      amount: '100000',
      penaltyRate: '20.00',
    });

    expect(result.penaltyAmount).toBe(20000);
    expect(result.payoutAmount).toBe(80000);
  });
});
```

---

#### **Phase 2: Integration Tests (Stripe)**

**Test:** `stripe-webhook.test.ts`

```typescript
describe('Stripe Webhook Handler', () => {
  it('should credit wallet on checkout.session.completed', async () => {
    const user = await createTestUser();
    const wallet = await getOrCreateWallet(user.id, 'EUR', 'fiat');

    // Create mock Stripe event
    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_xxx',
          amount_total: 500000, // €5000
          payment_status: 'paid',
          payment_intent: 'pi_test_xxx',
          metadata: {
            userId: user.id.toString(),
            walletId: wallet.id.toString(),
            type: 'wallet_deposit',
          },
        },
      },
    };

    // Process webhook
    await handleStripeCheckoutWebhook(event);

    // Verify wallet credited
    const updatedWallet = await getWallet(wallet.id);
    expect(parseFloat(updatedWallet.balance)).toBeCloseTo(5000, 2);

    // Verify transaction created
    const tx = await getWalletTransactionByStripeCheckoutSession('cs_test_xxx');
    expect(tx.type).toBe('deposit');
    expect(tx.status).toBe('completed');
  });
});
```

---

#### **Phase 3: End-to-End Tests (Frontend)**

**Test:** Playwright/Cypress

```typescript
test('User can deposit with Stripe', async ({ page }) => {
  // Login
  await page.goto('/sign-in');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');

  // Go to Wallet
  await page.goto('/investor/wallet');

  // Click deposit
  await page.click('button:has-text("Mit Kreditkarte einzahlen")');

  // Enter amount
  await page.fill('input[name="amount"]', '5000');
  await page.click('button:has-text("Mit Kreditkarte zahlen")');

  // Wait for redirect to Stripe
  await page.waitForURL(/checkout\.stripe\.com/);

  // Fill Stripe test card
  const iframe = page.frameLocator('iframe[name="stripe"]');
  await iframe.fill('[name="cardnumber"]', '4242424242424242');
  await iframe.fill('[name="exp-date"]', '1234');
  await iframe.fill('[name="cvc"]', '123');
  await iframe.fill('[name="postal"]', '10115');

  // Submit payment
  await iframe.click('button[type="submit"]');

  // Wait for redirect back
  await page.waitForURL(/payment\/deposit-success/);

  // Verify success message
  await expect(page.locator('text=Einzahlung erfolgreich')).toBeVisible();

  // Go back to wallet
  await page.click('button:has-text("Zum Wallet")');

  // Verify balance updated (with retry for webhook processing)
  await page.waitForFunction(() => {
    const balance = document.querySelector('[data-testid="wallet-balance"]')?.textContent;
    return balance?.includes('5,000');
  }, { timeout: 10000 });
});
```

---

#### **Phase 4: Manual Testing Checklist**

**Staging Environment Testing:**

**Wallet Deposit Flow:**
- [ ] User kann "Mit Kreditkarte einzahlen" klicken
- [ ] Dialog öffnet sich, Betrag kann eingegeben werden
- [ ] Zeigt Fee-Berechnung korrekt (1.5% + €0.25)
- [ ] Redirect zu Stripe Checkout funktioniert
- [ ] Stripe Test Card Zahlung erfolgreich
- [ ] Redirect zurück zu Success Page
- [ ] Wallet Balance wird aktualisiert (nach max. 5 Sek)
- [ ] Transaction erscheint in Historie
- [ ] Audit Log Eintrag vorhanden

**Investment aus Wallet:**
- [ ] Subscribe Page zeigt korrekte Balance
- [ ] Wenn zu wenig Guthaben: Error Message + "Wallet aufladen" Button
- [ ] Wenn genug Guthaben: Submit möglich
- [ ] Nach Submit: Subscription status = "pending_approval"
- [ ] availableBalance reduziert sich sofort
- [ ] balance bleibt gleich (noch nicht abgebucht)

**Admin Approval:**
- [ ] Admin sieht neue Subscription in "Zu genehmigen" Tab
- [ ] Approval Card zeigt alle Details korrekt
- [ ] "Genehmigen" → Subscription wird active
- [ ] balance wird jetzt reduziert
- [ ] paymentSchedules werden erstellt
- [ ] Investor erhält Email (optional)

**Early Withdrawal:**
- [ ] User kann "Vorzeitig auszahlen" klicken
- [ ] Dialog zeigt korrekte Penalty-Berechnung
- [ ] Password-Eingabe erforderlich
- [ ] Nach Submit: Status = "early_withdrawal_requested"
- [ ] Admin sieht Request in Tab
- [ ] Admin genehmigt → Wallet wird credited
- [ ] Penalty-Transaction sichtbar in Historie
- [ ] Subscription Status = "early_withdrawal_completed"

---

### 📋 **Testfälle für jeden Flow**

#### **Test Suite 1: Wallet Deposit**

| Test ID | Szenario | Expected Result |
|---------|----------|-----------------|
| WD-001 | User zahlt €5,000 mit erfolgreicher Kreditkarte | Balance +€4,924.75, Transaction completed |
| WD-002 | User zahlt €1,000 (Minimum) | Balance +€985, Success |
| WD-003 | User versucht €500 (unter Minimum) | Error: "Minimum €1,000" |
| WD-004 | User zahlt, bricht aber auf Stripe ab | Cancel Page, keine Balance-Änderung |
| WD-005 | User zahlt mit declined card | Error von Stripe, keine Balance-Änderung |
| WD-006 | Webhook kommt nicht an (simulieren) | Nach 5 Min: Alert, Manual Sync möglich |
| WD-007 | Duplicate webhook (2x senden) | Nur 1x credited, 2. Webhook ignored |

---

#### **Test Suite 2: Wallet-Based Investment**

| Test ID | Szenario | Expected Result |
|---------|----------|-----------------|
| WI-001 | User hat €150k, investiert €100k | available=€50k, balance=€150k (reserved), status=pending_approval |
| WI-002 | User hat €50k, versucht €100k | Error: "Insufficient funds", Button disabled |
| WI-003 | User hat €100k, investiert €100k | available=€0, kann nicht mehr investieren |
| WI-004 | User erstellt 2 Investments parallel | Zweites fails mit insufficient funds (Race Condition Test) |
| WI-005 | Admin genehmigt Investment | balance=€50k (abgebucht), subscription=active |
| WI-006 | Admin lehnt Investment ab | available=€150k (freed), subscription=rejected |
| WI-007 | Admin genehmigt, aber DB Error | Rollback: subscription bleibt pending, Retry möglich |

---

#### **Test Suite 3: Early Withdrawal**

| Test ID | Szenario | Expected Result |
|---------|----------|-----------------|
| EW-001 | User beantragt nach 12 Monaten | Request created, status=early_withdrawal_requested |
| EW-002 | Admin genehmigt | Wallet +€80k, penalty=-€20k, subscription=completed |
| EW-003 | User versucht 2x early withdrawal | Zweites fails: "Already requested" |
| EW-004 | User gibt falsches Password | Error: "Invalid password" |
| EW-005 | Penalty-Berechnung korrekt (20%) | €100k → €80k payout, €20k penalty |
| EW-006 | Future paymentSchedules werden cancelled | Keine weiteren Zinszahlungen |

---

## 9. PHASEN-PLAN

### 🚀 **Phase 1: Stripe Wallet-Einzahlung (PRIORITY 1)**

**Ziel:** User können Wallet per Kreditkarte aufladen

**Risiko:** 🟢 NIEDRIG (Neue Funktion, ändert nichts Bestehendes)

**Dauer:** 2-3 Wochen

**Tickets:**

#### **Backend (5-6 Tage):**
- [ ] **DB-001:** Schema Migration: wallets table (stripeCustomerId, lastDepositAt, totalDeposited, totalWithdrawn)
- [ ] **DB-002:** Schema Migration: walletTransactions table (stripePaymentIntentId, stripeCheckoutSessionId)
- [ ] **SVC-001:** `wallet-service.ts` erstellen (getOrCreateWallet, creditWallet, createStripeCustomer)
- [ ] **API-001:** tRPC endpoint: `wallet.depositWithStripe()`
- [ ] **API-002:** Express endpoint: `/api/webhooks/stripe/checkout` (POST)
- [ ] **WEB-001:** Stripe Checkout webhook handler (checkout.session.completed)
- [ ] **TEST-001:** Unit tests für wallet-service
- [ ] **TEST-002:** Integration tests für Stripe webhook

#### **Frontend (4-5 Tage):**
- [ ] **UI-001:** `StripeDepositDialog.tsx` Component
- [ ] **UI-002:** `DepositSuccess.tsx` Page
- [ ] **UI-003:** `DepositCancelled.tsx` Page
- [ ] **UI-004:** `useStripeCheckout.ts` Hook
- [ ] **UI-005:** Wallet.tsx: "Mit Kreditkarte einzahlen" Button hinzufügen
- [ ] **UI-006:** Wallet.tsx: Fee-Berechnung Display
- [ ] **UI-007:** Wallet.tsx: "Einzahlungshistorie" Tab

#### **Testing & Deployment (3-4 Tage):**
- [ ] **TEST-003:** E2E Test: Deposit Flow (Playwright)
- [ ] **TEST-004:** Manual testing auf Staging mit Stripe Test Mode
- [ ] **TEST-005:** Test alle declined card scenarios
- [ ] **TEST-006:** Test webhook retry (simulieren Server down)
- [ ] **DOC-001:** Admin Dokumentation: Fehlende Stripe Payments beheben
- [ ] **DEPLOY-001:** Deploy zu Staging mit Feature Flag OFF
- [ ] **DEPLOY-002:** Enable Feature Flag, test 48h
- [ ] **DEPLOY-003:** Deploy zu Production, Feature Flag ON

**Success Criteria:**
- ✅ User kann €1,000 - €1,000,000 einzahlen
- ✅ Wallet Balance aktualisiert sich innerhalb 10 Sekunden
- ✅ 99%+ Webhook Success Rate
- ✅ Keine Duplicate Credits
- ✅ Admin kann fehlende Payments manuell syncen

---

### 🚀 **Phase 2: Investment aus Wallet (PRIORITY 2)**

**Ziel:** User investieren aus Wallet-Guthaben statt direkter Stripe-Zahlung

**Risiko:** 🟡 MITTEL (Modifiziert bestehenden Subscribe-Flow)

**Dauer:** 3-4 Wochen

**Tickets:**

#### **Backend (7-8 Tage):**
- [ ] **DB-003:** Schema Migration: subscriptions table (walletTransactionId, approvedBy, approvedAt, rejectedBy, rejectionReason)
- [ ] **DB-004:** Enum update: subscriptions.status (pending_approval, rejected)
- [ ] **DB-005:** Enum update: walletTransactions.type (investment_debit)
- [ ] **SVC-002:** wallet-service.ts: reserveBalance() function
- [ ] **SVC-003:** wallet-service.ts: releaseReservedBalance() function
- [ ] **SVC-004:** wallet-service.ts: confirmReservedBalance() function
- [ ] **SVC-005:** wallet-service.ts: calculateAvailableBalance() function
- [ ] **API-003:** subscriptions.create() MODIFIZIEREN (Wallet Balance Check + Reserve)
- [ ] **API-004:** subscriptions.approveSubscription() (adminProcedure)
- [ ] **API-005:** subscriptions.rejectSubscription() (adminProcedure)
- [ ] **API-006:** subscriptions.getPendingApprovals() (adminProcedure)
- [ ] **TEST-007:** Unit tests für subscription approval flow
- [ ] **TEST-008:** Race Condition tests (parallel subscriptions)

#### **Frontend (5-6 Tage):**
- [ ] **UI-008:** Subscribe.tsx: Wallet Balance Check hinzufügen
- [ ] **UI-009:** Subscribe.tsx: Balance Preview ("Vorher/Nachher")
- [ ] **UI-010:** Subscribe.tsx: "Wallet aufladen" Button wenn zu wenig
- [ ] **UI-011:** MyInvestments.tsx: "Wartend auf Genehmigung" Badge
- [ ] **UI-012:** MyInvestments.tsx: "Abgelehnt" Badge + Grund
- [ ] **UI-013:** `SubscriptionApprovalCard.tsx` Component (Admin)
- [ ] **UI-014:** `SubscriptionApproval.tsx` Page (Admin)
- [ ] **UI-015:** Admin Navigation: Link zu "Subscription Approval"

#### **Testing & Deployment (4-5 Tage):**
- [ ] **TEST-009:** E2E Test: Subscribe with insufficient funds
- [ ] **TEST-010:** E2E Test: Subscribe with sufficient funds
- [ ] **TEST-011:** E2E Test: Admin approves subscription
- [ ] **TEST-012:** E2E Test: Admin rejects subscription
- [ ] **TEST-013:** Load Test: 10 concurrent subscriptions (Race Condition)
- [ ] **TEST-014:** Manual testing: Entire flow Deposit → Invest → Approve
- [ ] **DOC-002:** User Guide: "Wie investiere ich?"
- [ ] **DOC-003:** Admin Guide: "Subscriptions genehmigen"
- [ ] **DEPLOY-004:** Deploy zu Staging mit Feature Flag OFF
- [ ] **DEPLOY-005:** Enable Feature Flag, test 1 week
- [ ] **DEPLOY-006:** Deploy zu Production, Feature Flag ON

**Success Criteria:**
- ✅ User kann nur investieren wenn genug Balance
- ✅ Balance-Reservation funktioniert (kein Overdraft)
- ✅ Admin kann Subscriptions genehmigen/ablehnen
- ✅ Keine Race Conditions (parallel subscriptions)
- ✅ Bei Ablehnung: Geld wird freigegeben
- ✅ Bei Genehmigung: Geld wird abgebucht, paymentSchedules erstellt

---

### 🚀 **Phase 3: Vorzeitige Auszahlung mit 20% Penalty (PRIORITY 3)**

**Ziel:** User können Investments vorzeitig beenden (gegen 20% Penalty)

**Risiko:** 🟡 MITTEL (Neue Funktion, aber mit Financial Impact)

**Dauer:** 2-3 Wochen

**Tickets:**

#### **Backend (5-6 Tage):**
- [ ] **DB-006:** Schema Migration: subscriptions (earlyWithdrawalRequestedAt, earlyWithdrawalApprovedAt, penaltyRate)
- [ ] **DB-007:** Enum update: subscriptions.status (early_withdrawal_requested, early_withdrawal_completed)
- [ ] **DB-008:** Enum update: walletTransactions.type (penalty_deduction, early_withdrawal_credit)
- [ ] **DB-009:** walletTransactions fields: relatedSubscriptionId, penaltyAmount, originalAmount
- [ ] **SVC-006:** `penalty-calculator.ts` erstellen (calculateEarlyWithdrawalPenalty, validateEarlyWithdrawal)
- [ ] **API-007:** subscriptions.requestEarlyWithdrawal() (protectedProcedure)
- [ ] **API-008:** subscriptions.approveEarlyWithdrawal() (adminProcedure)
- [ ] **API-009:** subscriptions.getEarlyWithdrawalRequests() (adminProcedure)
- [ ] **TEST-015:** Unit tests für penalty calculator
- [ ] **TEST-016:** Integration tests für early withdrawal flow

#### **Frontend (4-5 Tage):**
- [ ] **UI-016:** `EarlyWithdrawalDialog.tsx` Component
- [ ] **UI-017:** MyInvestments.tsx: "Vorzeitig auszahlen" Button
- [ ] **UI-018:** MyInvestments.tsx: "Early Withdrawal Requested" Badge
- [ ] **UI-019:** Admin SubscriptionApproval: Tab "Vorzeitige Auszahlungen"
- [ ] **UI-020:** Admin: Early Withdrawal Approval Card

#### **Testing & Deployment (3-4 Tage):**
- [ ] **TEST-017:** E2E Test: Request early withdrawal
- [ ] **TEST-018:** E2E Test: Admin approves early withdrawal
- [ ] **TEST-019:** E2E Test: Penalty calculation (20% correct?)
- [ ] **TEST-020:** E2E Test: Future payment schedules cancelled
- [ ] **TEST-021:** Manual testing: Full early withdrawal flow
- [ ] **DOC-004:** User Guide: "Vorzeitige Auszahlung"
- [ ] **DOC-005:** Admin Guide: "Early Withdrawals genehmigen"
- [ ] **DEPLOY-007:** Deploy zu Staging with Feature Flag OFF
- [ ] **DEPLOY-008:** Enable Feature Flag, test 1 week
- [ ] **DEPLOY-009:** Deploy zu Production, Feature Flag ON

**Success Criteria:**
- ✅ User kann early withdrawal beantragen
- ✅ Penalty-Berechnung korrekt (20%)
- ✅ Admin kann genehmigen
- ✅ Wallet wird mit Netto-Betrag credited (80%)
- ✅ Penalty-Transaction sichtbar
- ✅ Zukünftige Zinszahlungen werden cancelled

---

### 🚀 **Phase 4: Crypto Wallet Integration (Alchemy) - SPÄTER**

**Ziel:** Crypto-Einzahlungen (BTC, ETH, USDT) mit Alchemy

**Risiko:** 🔴 HOCH (Neue Technologie, Security Critical)

**Dauer:** 4-6 Wochen

**Status:** BACKLOG (nicht für MVP)

**Warum später?**
- Komplexer (Blockchain Monitoring)
- Security-kritisch (Private Keys)
- Regulatorisch unklar (je nach Land)
- Weniger User-Demand (die meisten wollen Fiat)

**Wenn gewünscht:**
- Separate Plan erstellen
- Alchemy Account + API Keys
- Webhook für Deposit-Detection
- HD Wallet Generation pro User
- Transaction Confirmation Tracking (6 Confirmations)

---

## 📝 **ZUSAMMENFASSUNG**

### ✅ **Was wird implementiert:**

1. **Stripe Wallet-Einzahlung:**
   - User zahlt mit Kreditkarte/SEPA
   - Wallet wird automatisch credited
   - Webhook-basierte Verarbeitung

2. **Wallet-Based Investment:**
   - Subscribe nur möglich wenn genug Balance
   - Betrag wird reserviert (pending)
   - Admin-Approval erforderlich
   - Nach Approval: Geld abgebucht, Investment aktiv

3. **Vorzeitige Auszahlung:**
   - User kann Investment vorzeitig beenden
   - 20% Penalty wird abgezogen
   - Admin-Approval erforderlich
   - 80% werden ins Wallet credited

---

### 📊 **Metriken für Success:**

- ✅ **Wallet Adoption:** 80%+ der User haben Wallet erstellt
- ✅ **Stripe Deposit Success Rate:** 95%+ successful deposits
- ✅ **Investment Approval Time:** < 24h average (Admin Response)
- ✅ **Zero Negative Balances:** Keine Overdrafts durch Race Conditions
- ✅ **Webhook Success Rate:** 99%+ webhooks processed correctly
- ✅ **Early Withdrawal Rate:** < 10% of investments (hoffentlich!)

---

### 🎯 **Nächste Schritte:**

1. **Review dieses Plans** mit Team
2. **Entscheidungen treffen:**
   - Wer zahlt Stripe Fees? (Investor vs. Platform)
   - Wie hoch soll Minimum Deposit sein? (€1,000?)
   - Brauchen wir Double-Approval für große Beträge?
3. **Priorisierung bestätigen:**
   - Phase 1 → Phase 2 → Phase 3?
   - Oder parallel entwickeln?
4. **Team Assignment:**
   - Backend Dev: Stripe Integration + Wallet Service
   - Frontend Dev: UI Components
   - DevOps: Webhook Setup + Monitoring
5. **Kickoff Meeting** für Phase 1
6. **Staging Environment** vorbereiten (Stripe Test Mode)

---

**Dokument Ende**

Version: 1.0
Erstellt: 2026-01-24
Autor: Claude Sonnet 4.5
Status: ✅ Review Ready
