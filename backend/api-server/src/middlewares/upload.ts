import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { imageOrPdfFileFilter } from './uploadFileFilter';

// Get and guarantee that the uploads directory exists synchronously on disk
export const getUploadDir = () => {
  const uploadDir = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  return uploadDir;
};

// Guarantee directory on module load
getUploadDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = getUploadDir();
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    // Generate a unique filename: timestamp-random.ext
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure file filters and size limits
export const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024, fieldSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: imageOrPdfFileFilter,
});
