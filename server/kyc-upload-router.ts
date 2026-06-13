/**
 * KYC-Dokument-Routen (Angelus-only, sensibelste Datenkategorie inkl. Ausweis).
 * POST /api/kyc-document        — Zeichner lädt eigenen Pflicht-Nachweis hoch (auth + eigene submission)
 * GET  /api/kyc-document/:id    — ADMIN-only Download, im Stream entschlüsselt (kein Klartext-Temp)
 *
 * Sicherheits-Härtung (nicht verhandelbar):
 *  - multer memoryStorage (Buffer im RAM — nie Klartext auf Platte)
 *  - MIME-Whitelist NUR PDF/JPG/PNG (kein docx) + MAGIC-BYTE-Prüfung des echten Inhalts
 *  - 10 MB Limit, Dateiname-Sanitizing, Doc-ID-basierter Zugriff (kein Client-Pfad)
 *  - AES-256-GCM at rest (KYC_ENC_SECRET, runtime-only): Upload -> encryptBuffer -> .enc auf Volume
 *  - Admin-Download: Ciphertext lesen -> decryptBuffer in-memory -> direkt streamen
 *  - Rate-Limit auf der Upload-Route (in-memory, pro User+IP)
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { BRAND } from '../shared/brand';
import { ALL_DOC_TYPES } from '../shared/kyc-catalog';
import { UPLOAD_BASE, ensureDir, getAbsPath } from './upload-service';
import { encryptBuffer, decryptBuffer } from './kyc-crypto';
import { getLegacyCustomerByUserId } from './legacy-db';
import * as kycDb from './kyc-db';

const router = Router();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIMETYPES = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']);

// memoryStorage: Datei landet als Buffer im RAM (req.file.buffer), nie als Klartext auf dem Volume.
const kycUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIMETYPES.has(file.mimetype)) cb(null, true);
    else cb(new Error('Ungültiger Dateityp. Erlaubt: PDF, JPG, PNG'));
  },
});

// --- Magic-Byte (import erst hier, um Zyklen zu vermeiden) ---
import { verifyUpload } from './kyc-magic-bytes';

// --- In-memory Rate-Limit (pro Prozess/Instanz). Abuse-Schutz, kein verteiltes Limit. ---
const RL_WINDOW_MS = 10 * 60 * 1000; // 10 min
const RL_MAX = 30;                    // max 30 Uploads / Fenster pro Schlüssel
const rlHits = new Map<string, number[]>();
function rateLimited(key: string): boolean {
  const now = Date.now();
  const arr = (rlHits.get(key) ?? []).filter((t) => now - t < RL_WINDOW_MS);
  arr.push(now);
  rlHits.set(key, arr);
  return arr.length > RL_MAX;
}

function assertAngelus(res: Response): boolean {
  if (BRAND.key !== 'angelus') { res.status(403).json({ error: 'KYC nur im Angelus-Kontext' }); return false; }
  return true;
}

// POST /api/kyc-document — Zeichner lädt EIGENEN Nachweis hoch.
router.post('/kyc-document', kycUpload.single('file'), async (req: Request, res: Response) => {
  if (!assertAngelus(res)) return;
  if (!req.user?.id) { res.status(401).json({ error: 'Nicht authentifiziert' }); return; }

  // Rate-Limit pro User + IP.
  const rlKey = `${req.user.id}:${req.ip ?? '?'}`;
  if (rateLimited(rlKey)) { res.status(429).json({ error: 'Zu viele Uploads. Bitte später erneut.' }); return; }

  if (!req.file) { res.status(400).json({ error: 'Keine Datei hochgeladen' }); return; }

  const submissionId = req.body?.submissionId ? parseInt(req.body.submissionId as string, 10) : undefined;
  const docType = (req.body?.docType as string) || '';
  if (!submissionId) { res.status(400).json({ error: 'submissionId fehlt' }); return; }
  if (!ALL_DOC_TYPES.includes(docType)) { res.status(400).json({ error: 'Ungültiger docType' }); return; }

  try {
    // Nur Bestandszeichner.
    const customer = await getLegacyCustomerByUserId(req.user.id);
    if (!customer) { res.status(403).json({ error: 'KYC nur für Bestandszeichner' }); return; }

    // Eigentums-Prüfung: die Einreichung muss DEM eingeloggten User gehören (kein fremdes Unterschieben).
    const submission = await kycDb.getSubmissionById(submissionId);
    if (!submission || submission.userId !== req.user.id) {
      res.status(403).json({ error: 'Kein Zugriff auf diese Einreichung' }); return;
    }
    // Nur in offenen Status hochladbar (kein Nachschieben nach Endentscheid).
    if (!['eingereicht', 'in_pruefung', 'nachforderung'].includes(submission.status)) {
      res.status(409).json({ error: `Upload im Status "${submission.status}" nicht möglich` }); return;
    }

    // MAGIC-BYTE: echter Dateiinhalt muss PDF/JPG/PNG sein UND zum gemeldeten Typ passen.
    const verified = verifyUpload(req.file.buffer, req.file.mimetype);
    if ('error' in verified) { res.status(400).json({ error: verified.error }); return; }

    // Verschlüsseln + auf Volume schreiben ([12 IV][16 Tag][CT]).
    const cipher = encryptBuffer(req.file.buffer);
    const dir = path.join(UPLOAD_BASE, 'kyc', String(req.user.id));
    ensureDir(dir);
    const safeBase = (req.file.originalname || docType).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    const filename = `${Date.now()}_${docType}_${safeBase}.${verified.ext}.enc`;
    const absPath = path.join(dir, filename);
    fs.writeFileSync(absPath, cipher);
    const relPath = path.relative(UPLOAD_BASE, absPath);

    const docId = await kycDb.addDocument({
      submissionId,
      userId: req.user.id,
      docType,
      filePath: relPath,
      originalFilename: req.file.originalname?.slice(0, 255) ?? null,
      mimeType: verified.mime,                 // gesnifft, nicht Client-Angabe
      size: req.file.size,
      encrypted: true,
      uploadedAt: new Date(),
    } as any);

    await kycDb.addCaseLog({
      userId: req.user.id, submissionId, eventType: 'dokument_hochgeladen',
      actor: `user:${req.user.id}`, note: `Dokument ${docType} (${verified.mime}, ${req.file.size} B) verschlüsselt abgelegt`,
    });

    res.json({ id: docId, docType, mime: verified.mime, size: req.file.size });
  } catch (e: any) {
    console.error('[kyc-document] Upload-Fehler:', e?.message);
    res.status(500).json({ error: `Speichern fehlgeschlagen: ${e?.message ?? 'unbekannt'}` });
  }
});

// GET /api/kyc-document/:id — ADMIN-only. Entschlüsselt im Speicher, streamt direkt (kein Temp-Klartext).
router.get('/kyc-document/:id', async (req: Request, res: Response) => {
  if (!assertAngelus(res)) return;
  if (!req.user?.id) { res.status(401).json({ error: 'Nicht authentifiziert' }); return; }
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    res.status(403).json({ error: 'Kein Zugriff' }); return;
  }
  const id = parseInt(req.params.id, 10);
  if (!id) { res.status(400).json({ error: 'Ungültige id' }); return; }

  try {
    const doc = await kycDb.getDocumentById(id);
    if (!doc) { res.status(404).json({ error: 'Dokument nicht gefunden' }); return; }
    const absPath = getAbsPath(doc.filePath);
    if (!fs.existsSync(absPath)) { res.status(404).json({ error: 'Datei nicht auf Filesystem gefunden' }); return; }

    const cipher = fs.readFileSync(absPath);
    const plain = decryptBuffer(cipher);   // wirft bei Manipulation/falschem Secret
    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    const fn = (doc.originalFilename || `kyc_${id}`).replace(/[^a-zA-Z0-9._-]/g, '_');
    res.setHeader('Content-Disposition', `inline; filename="${fn}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(plain);
  } catch (e: any) {
    console.error('[kyc-document] Download/Decrypt-Fehler:', e?.message);
    res.status(500).json({ error: 'Datei konnte nicht entschlüsselt werden' });
  }
});

export default router;
