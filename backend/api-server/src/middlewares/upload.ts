import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { imageOrPdfFileFilter } from './uploadFileFilter';

// Get and guarantee that the uploads directory exists and is 100% writable on disk
export const getUploadDir = (): string => {
  const primaryDir = path.resolve(process.cwd(), 'uploads');
  try {
    if (!fs.existsSync(primaryDir)) {
      fs.mkdirSync(primaryDir, { recursive: true, mode: 0o777 });
    } else {
      const stat = fs.statSync(primaryDir);
      if (!stat.isDirectory()) {
        fs.unlinkSync(primaryDir);
        fs.mkdirSync(primaryDir, { recursive: true, mode: 0o777 });
      }
    }

    // Verify write permissions with a temporary test file
    const testFile = path.join(primaryDir, `.write-test-${Date.now()}`);
    fs.writeFileSync(testFile, 'writable');
    fs.unlinkSync(testFile);

    return primaryDir;
  } catch (err) {
    console.warn('[Upload Middleware] Primary uploadDir not writable, using /tmp/uploads fallback:', err);
    const fallbackDir = path.resolve('/tmp', 'uploads');
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
    try {
      const dir = getUploadDir();
      cb(null, dir);
    } catch (err: any) {
      cb(err, '/tmp/uploads');
    }
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
