// KYC/AML-Feld-Katalog — EINZIGE Quelle der Wahrheit für Frontend (Render) UND Backend (autoritative
// Validierung). Sumsub raus: Eigen-Identifizierung => identitaet_nachweis (Ausweis/Pass) ist PFLICHT.
// 5 Blöcke, alle Felder Pflicht, 4 Pflicht-Uploads. Server validiert IMMER neu (validateKycFields) —
// Client-Validierung ist nur UX. Erweiterung => ACTIVE_KYC_VERSION in kyc-version.ts hochsetzen.

export type KycFieldType = 'text' | 'textarea' | 'checkbox' | 'multiselect' | 'select' | 'date' | 'number';

export interface KycFieldDef {
  key: string;
  label: string;
  type: KycFieldType;
  required: boolean;
  minLength?: number;                          // für text/textarea
  options?: { value: string; label: string }[]; // für select/multiselect
  /** Feld nur Pflicht/sichtbar, wenn anderes Feld einen bestimmten Wert hat. */
  conditionalOn?: { key: string; equals: string };
  /** Checkbox muss zwingend true sein (Erklärungen/Bestätigungen). */
  mustBeTrue?: boolean;
}

export interface KycDocDef {
  docType: string;
  label: string;
  required: boolean;
}

export interface KycBlockDef {
  key: string;
  title: string;
  fields: KycFieldDef[];
  doc?: KycDocDef;
}

const SOF_ARTEN: { value: string; label: string }[] = [
  { value: 'erwerbseinkommen', label: 'Erwerbseinkommen / Gehalt' },
  { value: 'unternehmensgewinn', label: 'Unternehmensgewinn / Selbstständigkeit' },
  { value: 'kapitalertraege', label: 'Kapitalerträge / Wertpapiere' },
  { value: 'immobilienverkauf', label: 'Verkauf von Immobilien' },
  { value: 'unternehmensverkauf', label: 'Verkauf eines Unternehmens / Beteiligung' },
  { value: 'erbschaft_schenkung', label: 'Erbschaft / Schenkung' },
  { value: 'ersparnisse', label: 'Angesparte Ersparnisse' },
  { value: 'sonstiges', label: 'Sonstiges (bitte erläutern)' },
];

const JA_NEIN: { value: string; label: string }[] = [
  { value: 'nein', label: 'Nein' },
  { value: 'ja', label: 'Ja' },
];

export const KYC_CATALOG: KycBlockDef[] = [
  {
    key: 'block1_sof',
    title: 'Herkunft der Mittel (Source of Funds)',
    fields: [
      { key: 'sof_arten', label: 'Art(en) der Mittelherkunft', type: 'multiselect', required: true, options: SOF_ARTEN },
      { key: 'sof_erlaeuterung', label: 'Erläuterung der Mittelherkunft', type: 'textarea', required: true, minLength: 30 },
    ],
    doc: { docType: 'sof_nachweis', label: 'Nachweis der Mittelherkunft (z. B. Gehaltsabrechnung, Verkaufsvertrag)', required: true },
  },
  {
    key: 'block2_sow',
    title: 'Herkunft des Vermögens (Source of Wealth)',
    fields: [
      { key: 'sow_beschreibung', label: 'Beschreibung des Vermögensaufbaus', type: 'textarea', required: true, minLength: 30 },
      { key: 'sow_herkunftsland', label: 'Land der Vermögensherkunft', type: 'text', required: true, minLength: 2 },
    ],
    doc: { docType: 'sow_nachweis', label: 'Nachweis des Vermögens (z. B. Vermögensaufstellung, Kontoauszug)', required: true },
  },
  {
    key: 'block3_steuer',
    title: 'Steuerliche Angaben',
    fields: [
      { key: 'steuer_bestaetigung', label: 'Ich bestätige die steuerliche Erfassung der angelegten Mittel.', type: 'checkbox', required: true, mustBeTrue: true },
      { key: 'steuer_ansaessigkeit', label: 'Land der steuerlichen Ansässigkeit', type: 'text', required: true, minLength: 2 },
      { key: 'steuer_id', label: 'Steuerliche Identifikationsnummer', type: 'text', required: true, minLength: 5 },
    ],
    doc: { docType: 'steuer_nachweis', label: 'Steuerlicher Nachweis (z. B. Steuerbescheid, Ansässigkeitsbescheinigung)', required: true },
  },
  {
    key: 'block4_status',
    title: 'Politischer/wirtschaftlicher Status',
    fields: [
      { key: 'pep_status', label: 'Sind Sie eine politisch exponierte Person (PEP) oder nahestehend?', type: 'select', required: true, options: JA_NEIN },
      { key: 'pep_funktion', label: 'Funktion / Beziehung (falls PEP)', type: 'text', required: true, conditionalOn: { key: 'pep_status', equals: 'ja' }, minLength: 2 },
      { key: 'wirtschaftlich_berechtigter', label: 'Wirtschaftlich Berechtigter', type: 'select', required: true, options: [
        { value: 'selbst', label: 'Ich handle auf eigene Rechnung' },
        { value: 'dritter', label: 'Für einen Dritten' },
      ] },
      { key: 'wb_angaben', label: 'Angaben zum wirtschaftlich Berechtigten (falls Dritter)', type: 'textarea', required: true, conditionalOn: { key: 'wirtschaftlich_berechtigter', equals: 'dritter' }, minLength: 10 },
      { key: 'sanktions_erklaerung', label: 'Ich erkläre, auf keiner Sanktionsliste geführt zu werden.', type: 'checkbox', required: true, mustBeTrue: true },
      { key: 'staatsangehoerigkeit', label: 'Staatsangehörigkeit', type: 'text', required: true, minLength: 2 },
      { key: 'geburtsdatum', label: 'Geburtsdatum', type: 'date', required: true },
      { key: 'geburtsort', label: 'Geburtsort', type: 'text', required: true, minLength: 2 },
    ],
  },
  {
    key: 'block5_profil',
    title: 'Anlegerprofil & Identität',
    fields: [
      { key: 'beruf_branche', label: 'Beruf / Branche', type: 'text', required: true, minLength: 2 },
      { key: 'anlagesumme', label: 'Geplante/bestehende Anlagesumme (EUR)', type: 'number', required: true },
      { key: 'kapital_herkunftsland', label: 'Herkunftsland des eingesetzten Kapitals', type: 'text', required: true, minLength: 2 },
    ],
    doc: { docType: 'identitaet_nachweis', label: 'Ausweisdokument (Personalausweis oder Reisepass)', required: true },
  },
];

// Pflicht-Uploads (4) — auch die Upload-Route prüft gegen diese Liste.
export const REQUIRED_DOC_TYPES: string[] = KYC_CATALOG
  .filter((b) => b.doc?.required)
  .map((b) => b.doc!.docType);

export const ALL_DOC_TYPES: string[] = KYC_CATALOG.filter((b) => b.doc).map((b) => b.doc!.docType);

function isVisible(field: KycFieldDef, values: Record<string, string>): boolean {
  if (!field.conditionalOn) return true;
  return (values[field.conditionalOn.key] ?? '') === field.conditionalOn.equals;
}

/**
 * Autoritative Feld-Validierung (Server nutzt sie; Frontend für Live-UX). Liefert Liste von
 * Fehlern (leeres Array = ok). multiselect-Werte werden als JSON-Array-String erwartet.
 * Dokumente werden NICHT hier geprüft (separater Upload-Pfad), nur Textfelder/Checkboxen.
 */
export function validateKycFields(values: Record<string, string>): string[] {
  const errors: string[] = [];
  for (const block of KYC_CATALOG) {
    for (const f of block.fields) {
      if (!f.required || !isVisible(f, values)) continue;
      const raw = values[f.key];
      if (f.type === 'checkbox') {
        if (f.mustBeTrue && raw !== 'true') errors.push(`${f.label}: muss bestätigt werden`);
        continue;
      }
      if (f.type === 'multiselect') {
        let arr: unknown = [];
        try { arr = JSON.parse(raw ?? '[]'); } catch { /* invalid */ }
        if (!Array.isArray(arr) || arr.length < 1) errors.push(`${f.label}: mindestens eine Auswahl erforderlich`);
        continue;
      }
      const v = (raw ?? '').trim();
      if (!v) { errors.push(`${f.label}: Pflichtfeld`); continue; }
      if (f.minLength && v.length < f.minLength) errors.push(`${f.label}: mindestens ${f.minLength} Zeichen`);
    }
  }
  return errors;
}
