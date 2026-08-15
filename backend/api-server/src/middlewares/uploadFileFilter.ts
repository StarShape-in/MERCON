import path from 'path';
import multer from 'multer';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
  'application/x-pdf',
  'application/acrobat',
  'applications/vnd.pdf',
  'text/pdf',
  'application/octet-stream',
]);

/**
 * Restricts uploads to images + PDF. Checks both MIME type and file extension
 * to handle browser/OS variations (e.g. Windows sending application/octet-stream for PDFs).
 */
export const imageOrPdfFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isAllowedExt = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'].includes(ext);

  if (ALLOWED_MIME_TYPES.has(file.mimetype) || isAllowedExt) {
    cb(null, true);
  } else {
    cb(new Error('Only image or PDF files are allowed'));
  }
};

