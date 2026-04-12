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

export default router;
