/**
 * Upload Router — Express routes for file upload & serving
 * POST /api/upload  — Upload a file (admin only)
 * GET  /api/files/* — Serve a file (admin or owner)
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { upload, getAbsPath, UPLOAD_BASE } from './upload-service';
import * as db from './db';
import * as legacyDb from './legacy-db';

const router = Router();

// POST /api/upload
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Nicht authentifiziert' });
    return;
  }
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    res.status(403).json({ error: 'Nur Admins dürfen Dateien hochladen' });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: 'Keine Datei hochgeladen' });
    return;
  }

  const category = ((req.body?.category as string) || 'general') as
    | 'kyc' | 'contracts' | 'payments' | 'general';
  const contractId = req.body?.contractId ? parseInt(req.body.contractId as string) : undefined;

  let fileUserId = req.user.id;
  if (contractId) {
    const contract = await db.getLegacyContractById(contractId);
    if (contract) fileUserId = contract.userId;
  }

  const relPath = path.relative(UPLOAD_BASE, req.file.path);

  const docId = await db.createDocument({
    userId: fileUserId,
    contractId: contractId ?? null,
    category,
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    filePath: relPath,
    uploadedBy: req.user.id,
  } as any);

  res.json({
    id: docId,
    filePath: relPath,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    mimeType: req.file.mimetype,
  });
});

// GET /api/files/* — serve file (admin or document owner)
router.get('/files/*', async (req: Request, res: Response) => {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Nicht authentifiziert' });
    return;
  }

  // Extract relative path from URL: /files/payments/257/123_file.pdf → payments/257/123_file.pdf
  const relPath = req.path.replace(/^\/files\//, '');
  const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

  const doc = await db.getDocumentByPath(relPath);
  if (!doc) {
    res.status(404).json({ error: 'Datei nicht gefunden' });
    return;
  }
  if (!isAdmin && doc.userId !== req.user.id) {
    res.status(403).json({ error: 'Kein Zugriff' });
    return;
  }

  const absPath = getAbsPath(relPath);
  if (!fs.existsSync(absPath)) {
    res.status(404).json({ error: 'Datei nicht auf Filesystem gefunden' });
    return;
  }

  res.sendFile(absPath);
});

// ============================================================
// Zeichnungsschein — REICHES Modell (legacy_customers). KYC-relevant.
// ============================================================

// POST /api/legacy-zeichnungsschein — ADMIN-ONLY. Zielkunde via legacyCustomerId (Body),
// NICHT ueber contractId/modernes Modell. Datei -> Volume, Metadaten -> legacy_customer_documents.
router.post('/legacy-zeichnungsschein', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Nicht authentifiziert' });
    return;
  }
  // <<< ADMIN-GATING: nur Admin/Superadmin darf hochladen — sonst koennte jemand
  //     einem fremden Kunden ein Dokument unterschieben. >>>
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    res.status(403).json({ error: 'Nur Admins dürfen Zeichnungsscheine hochladen' });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: 'Keine Datei hochgeladen' });
    return;
  }
  const legacyCustomerId = req.body?.legacyCustomerId
    ? parseInt(req.body.legacyCustomerId as string)
    : undefined;
  if (!legacyCustomerId) {
    res.status(400).json({ error: 'legacyCustomerId fehlt' });
    return;
  }
  const customer = await legacyDb.getLegacyCustomerById(legacyCustomerId);
  if (!customer) {
    res.status(404).json({ error: 'Bestandskunde nicht gefunden' });
    return;
  }

  const relPath = path.relative(UPLOAD_BASE, req.file.path);
  await legacyDb.addLegacyCustomerDocument({
    legacyCustomerId,
    documentType: 'zeichnungsschein',
    fileName: req.file.originalname,
    filePath: relPath,
    fileSize: req.file.size,
    fileType: req.file.mimetype,
    uploadedBy: req.user.id,
  });

  res.json({ ok: true, fileName: req.file.originalname, size: req.file.size });
});

// GET /api/zeichnungsschein — KEIN Parameter. Owner ausschliesslich aus der Session.
// KYC-kritisch: ein Zeichner kann technisch nur seinen EIGENEN Schein anfordern (kein Input-ID).
router.get('/zeichnungsschein', async (req: Request, res: Response) => {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Nicht authentifiziert' });
    return;
  }
  // <<< GATING-ZEILE: Kunde wird NUR aus der eingeloggten Session abgeleitet, nie aus dem Request. >>>
  const c = await legacyDb.getLegacyCustomerByUserId(req.user.id);
  if (!c) {
    res.status(404).json({ error: 'Kein Bestandsvertrag' });
    return;
  }
  const docs = await legacyDb.getLegacyCustomerDocuments(c.id); // c.id, nicht aus Request
  const schein = docs.find((d) => d.documentType === 'zeichnungsschein');
  if (!schein) {
    res.status(404).json({ error: 'Kein Zeichnungsschein hinterlegt' });
    return;
  }
  const absPath = getAbsPath(schein.filePath);
  if (!fs.existsSync(absPath)) {
    res.status(404).json({ error: 'Datei nicht auf Filesystem gefunden' });
    return;
  }
  res.sendFile(absPath);
});

// GET /api/admin/legacy-zeichnungsschein/:legacyCustomerId — ADMIN-ONLY, mit Ziel-ID.
router.get('/admin/legacy-zeichnungsschein/:legacyCustomerId', async (req: Request, res: Response) => {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Nicht authentifiziert' });
    return;
  }
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    res.status(403).json({ error: 'Kein Zugriff' });
    return;
  }
  const legacyCustomerId = parseInt(req.params.legacyCustomerId);
  if (!legacyCustomerId) {
    res.status(400).json({ error: 'Ungültige legacyCustomerId' });
    return;
  }
  const docs = await legacyDb.getLegacyCustomerDocuments(legacyCustomerId);
  const schein = docs.find((d) => d.documentType === 'zeichnungsschein');
  if (!schein) {
    res.status(404).json({ error: 'Kein Zeichnungsschein hinterlegt' });
    return;
  }
  const absPath = getAbsPath(schein.filePath);
  if (!fs.existsSync(absPath)) {
    res.status(404).json({ error: 'Datei nicht auf Filesystem gefunden' });
    return;
  }
  res.sendFile(absPath);
});

export default router;
