import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { imageOrPdfFileFilter } from './uploadFileFilter';

// Get and guarantee a 100% writable uploads directory inside the Docker container
export const getUploadDir = (): string => {
  const dir = path.resolve('/tmp', 'uploads');
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o777 });
    }
  } catch (_) {}
  return dir;
};

// Guarantee directory on module load
getUploadDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = getUploadDir();
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const safeExt = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `files-${uniqueSuffix}${safeExt}`);
  }
});

export const upload = multer({
  storage: storage,
  limits: { fileSize: 150 * 1024 * 1024, fieldSize: 150 * 1024 * 1024 },
  fileFilter: imageOrPdfFileFilter,
});
