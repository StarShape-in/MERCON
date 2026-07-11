import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/userController';
import { authenticateJWT } from '../middlewares/auth';
import { authorizeRoles } from '../middlewares/rbac';

const router = Router();

// Only Admin can access these routes
router.use(authenticateJWT);
router.use(authorizeRoles('Admin'));

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
