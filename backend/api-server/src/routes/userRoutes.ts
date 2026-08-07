import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/userController';
import { authenticateJWT } from '../middlewares/auth';
import { authorizeRoles } from '../middlewares/rbac';
import { validate } from '../middlewares/validate';
import { createUserBody, updateUserBody, idParam } from '../schemas';

const router = Router();

// Admin and Operator can access these routes
router.use(authenticateJWT);
router.use(authorizeRoles('Admin', 'Operator'));

router.get('/', getUsers);
router.post('/', validate({ body: createUserBody }), createUser);
router.put('/:id', validate({ params: idParam, body: updateUserBody }), updateUser);
router.delete('/:id', validate({ params: idParam }), deleteUser);

export default router;
