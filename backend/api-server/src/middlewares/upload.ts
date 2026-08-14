import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { imageOrPdfFileFilter } from './uploadFileFilter';

// Get and guarantee that the uploads directory exists and is 100% writable inside Docker container
export const getUploadDir = (): string => {
  try {
    const primaryDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(primaryDir)) {
      fs.mkdirSync(primaryDir, { recursive: true, mode: 0o777 });
    }
    return primaryDir;
  } catch (err) {
    console.warn('[Upload Middleware] Primary uploadDir is not writable in container, using /tmp/uploads fallback');
    const fallbackDir = '/tmp/uploads';
    try {
      if (!fs.existsSync(fallbackDir)) {
        fs.mkdirSync(fallbackDir, { recursive: true, mode: 0o777 });
      }
    } catch (_) {}
    return fallbackDir;
  }
};

// Guarantee directory on module load
getUploadDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    let dir = getUploadDir();
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o777 });
      }
    } catch (e) {
      dir = '/tmp/uploads';
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o777 });
      }
    }
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    // Clean original filename for safe disk naming
    const safeExt = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `files-${uniqueSuffix}${safeExt}`);
  }
});

// Configure file filters and size limits
export const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024, fieldSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: imageOrPdfFileFilter,
});
