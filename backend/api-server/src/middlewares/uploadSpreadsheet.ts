import multer from 'multer';
import path from 'path';

/**
 * A separate multer instance for company Excel report templates, kept apart
 * from `upload.ts`'s image/PDF instance rather than widening
 * `uploadFileFilter.ts` — that filter backs the Documents module and
 * deliberately excludes spreadsheets. Templates are read once into memory,
 * inspected/spliced, and stored as `ReportTemplate.file_data` in Postgres —
 * they never touch disk, so memoryStorage (not the shared diskStorage) is
 * correct here.
 */
const spreadsheetFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isAllowedExt = ['.xlsx', '.xlsm'].includes(ext);
  const isAllowedMime = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel.sheet.macroEnabled.12',
    'application/octet-stream',
  ].includes(file.mimetype);

  if (isAllowedExt && isAllowedMime) {
    cb(null, true);
  } else {
    cb(new Error('Only .xlsx or .xlsm workbook files are allowed'));
  }
};

export const uploadSpreadsheet = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: spreadsheetFileFilter,
});
