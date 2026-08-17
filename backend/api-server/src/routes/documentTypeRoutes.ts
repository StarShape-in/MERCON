import { Router } from 'express';
import { getDocumentTypes, createDocumentType, updateDocumentType, deleteDocumentType } from '../controllers/documentTypeController';
import { authenticateJWT } from '../middlewares/auth';
import { authorizeRoles, requireModuleEnabled } from '../middlewares/rbac';

const router = Router();

router.use(authenticateJWT);
router.use(authorizeRoles('Admin', 'Operator'));
router.use(requireModuleEnabled('documents'));

// Read access: Admin + Operator (they need this to populate upload pickers).
router.get('/', getDocumentTypes);

// Structural configuration changes: Admin only.
router.post('/', authorizeRoles('Admin'), createDocumentType);
router.patch('/:id', authorizeRoles('Admin'), updateDocumentType);
router.delete('/:id', authorizeRoles('Admin'), deleteDocumentType);

export default router;
