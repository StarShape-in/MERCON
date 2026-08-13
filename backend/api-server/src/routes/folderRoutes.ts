import { Router } from 'express';
import { getFolders, createFolder, updateFolder, deleteFolder } from '../controllers/folderController';
import { authenticateJWT } from '../middlewares/auth';
import { authorizeRoles } from '../middlewares/rbac';

const router = Router();

router.use(authenticateJWT);
router.use(authorizeRoles('Admin', 'Operator'));

router.get('/', getFolders);
router.post('/', createFolder);
router.patch('/:id', updateFolder);
router.delete('/:id', deleteFolder);

export default router;
