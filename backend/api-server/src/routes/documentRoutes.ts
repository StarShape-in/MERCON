import { Router } from 'express';
import { getDocuments, getDocumentById, uploadDocument, updateDocumentStatus, deleteDocument } from '../controllers/documentController';
import { authenticateJWT } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = Router();

router.use(authenticateJWT);

// List all documents (filterable by entity_type, entity_id, doc_type, status, expiring_within_days)
router.get('/', getDocuments);

// Get a single document
router.get('/:id', getDocumentById);

// Upload a new document — 'file' is the multipart field name
router.post('/', upload.single('file'), uploadDocument);

// Update document status (Verified, Rejected, PendingReview, Expired)
router.patch('/:id/status', updateDocumentStatus);

// Soft delete
router.delete('/:id', deleteDocument);

export default router;
