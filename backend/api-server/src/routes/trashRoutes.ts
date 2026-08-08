import { Router } from 'express';
import { getTrashItems, restoreTrashItem, hardDeleteTrashItem } from '../controllers/trashController';
import { authenticateJWT } from '../middlewares/auth';
import { authorizeRoles } from '../middlewares/rbac';

const router = Router();

// Gated by JWT authentication and Admin/Operator roles
router.use(authenticateJWT);
router.use(authorizeRoles('Admin', 'Operator'));

router.get('/', getTrashItems);
router.post('/:type/:id/restore', restoreTrashItem);
router.delete('/:type/:id', hardDeleteTrashItem);

export default router;
