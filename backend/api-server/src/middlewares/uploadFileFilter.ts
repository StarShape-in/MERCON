import path from 'path';
import multer from 'multer';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
  'image/tiff',
  'image/bmp',
  'application/pdf',
  'application/x-pdf',
  'application/acrobat',
  'applications/vnd.pdf',
  'text/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/rtf',
  'application/octet-stream',
]);

/**
 * Restricts uploads to standard document and image formats. Checks both MIME type and file extension
 * to handle browser/OS variations (e.g. Windows sending application/octet-stream for PDFs).
 */
export const imageOrPdfFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isAllowedExt = [
    '.pdf', '.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.gif', '.tiff', '.bmp',
    '.doc', '.docx', '.xls', '.xlsx', '.txt', '.rtf', '.csv'
  ].includes(ext);

  if (ALLOWED_MIME_TYPES.has(file.mimetype) || isAllowedExt) {
    cb(null, true);
  } else {
    cb(new Error('Only standard document and image files are allowed'));
  }
};

