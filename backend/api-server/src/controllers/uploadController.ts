import { Request, Response } from 'express';
import { upload } from '../middlewares/upload';

import { compressUploadedImage } from '../services/imageCompressor';

export { upload };

export const handleUpload = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' } });
    }

    // Compress image to optimize disk space & bandwidth
    await compressUploadedImage(req.file.path);

    // Construct the public URL (in production, this would be an S3/R2 URL)
    const fileUrl = `/uploads/${req.file.filename}`;

    res.status(201).json({
      success: true,
      data: {
        file_url: fileUrl,
        original_name: req.file.originalname,
        mime_type: req.file.mimetype,
        size: req.file.size
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};
