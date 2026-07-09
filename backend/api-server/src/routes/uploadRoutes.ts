import { Router } from 'express';
import { upload, handleUpload } from '../controllers/uploadController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

// Require authentication for uploads
router.use(authenticateJWT);

// Expecting a file field named "file"
router.post('/', upload.single('file'), handleUpload);

export default router;
