import fs from 'fs';
import path from 'path';

let sharpInstance: any = null;
let sharpAttempted = false;

function getSharp(): any {
  if (sharpAttempted) return sharpInstance;
  sharpAttempted = true;
  try {
    // Lazy require sharp so a missing or platform-incompatible native binding
    // never crashes the server on startup or causes a 502 Bad Gateway error.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    sharpInstance = require('sharp');
  } catch (err: any) {
    console.warn('[ImageCompressor] Sharp native module unavailable:', err?.message || err);
    sharpInstance = null;
  }
  return sharpInstance;
}

/**
 * Optimizes and compresses uploaded images (JPEG, PNG, WebP, HEIC).
 * - Resizes large photos to max 1920x1920 bounding box (maintaining aspect ratio).
 * - Corrects mobile camera EXIF orientation via `.rotate()`.
 * - Compresses JPEG to 80% quality (reducing 8-15MB phone photos down to ~200-400KB).
 * - Leaves non-image files (like PDFs) intact.
 * - Safely returns original file if sharp is not available on the host platform.
 */
export async function compressUploadedImage(filePath: string): Promise<string> {
  try {
    if (!filePath || !fs.existsSync(filePath)) return filePath;
    const ext = path.extname(filePath).toLowerCase();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];
    if (!imageExtensions.includes(ext)) return filePath;

    const sharp = getSharp();
    if (!sharp) {
      // Native sharp bindings unavailable on this container OS — return original file cleanly
      return filePath;
    }

    const tmpCompressedPath = `${filePath}.compressed.jpg`;

    await sharp(filePath)
      .rotate() // Auto-orient based on camera EXIF tags
      .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true })
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
