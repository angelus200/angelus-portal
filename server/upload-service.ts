/**
 * Upload Service — multer config for Railway Volume storage
 * Files stored at: /app/uploads/{category}/{userId}/{timestamp}_{filename}
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';

export const UPLOAD_BASE = process.env.UPLOAD_PATH ?? '/app/uploads';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIMETYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function getAbsPath(relPath: string): string {
  return path.join(UPLOAD_BASE, relPath);
}

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const category = (req.body?.category as string) || 'general';
    const userId = (req as any).user?.id ?? 'anonymous';
    const dir = path.join(UPLOAD_BASE, category, String(userId));
    ensureDir(dir);
    cb(null, dir);
  },
  filename(_req, file, cb) {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${ts}_${safe}`);
  },
});

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) {
  if (ALLOWED_MIMETYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Ungültiger Dateityp. Erlaubt: PDF, JPG, PNG, DOCX'));
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});
