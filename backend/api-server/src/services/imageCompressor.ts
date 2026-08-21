import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

/**
 * Optimizes and compresses uploaded images (JPEG, PNG, WebP, HEIC).
 * - Resizes large photos to max 1920x1920 bounding box (maintaining aspect ratio).
 * - Corrects mobile camera EXIF orientation via `.rotate()`.
 * - Compresses JPEG to 80% quality (reducing 8-15MB phone photos down to ~200-400KB).
 * - Leaves non-image files (like PDFs) intact.
 */
export async function compressUploadedImage(filePath: string): Promise<string> {
  try {
    if (!filePath || !fs.existsSync(filePath)) return filePath;
    const ext = path.extname(filePath).toLowerCase();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];
    if (!imageExtensions.includes(ext)) return filePath;

    const tmpCompressedPath = `${filePath}.compressed.jpg`;

    await sharp(filePath)
      .rotate() // Auto-orient based on camera EXIF tags
      .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true, mozjpeg: true })
      .toFile(tmpCompressedPath);

    const origStats = fs.statSync(filePath);
    const compStats = fs.statSync(tmpCompressedPath);

    if (compStats.size < origStats.size) {
      fs.unlinkSync(filePath);
      fs.renameSync(tmpCompressedPath, filePath);
    } else {
      fs.unlinkSync(tmpCompressedPath);
    }
  } catch (err) {
    console.warn(`[ImageCompressor] Skipping compression for ${filePath}:`, (err as Error).message);
  }
  return filePath;
}
