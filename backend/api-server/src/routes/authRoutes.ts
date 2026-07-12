import { Router } from 'express';
import { login, getMe, updateMe, changePassword } from '../controllers/authController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

// Unified login for all roles (Admin, Operator, Driver)
router.post('/login', login);

// Authenticated profile management
// Note: forgotten passwords are reset by an operator/admin via User Management,
// not self-service — so there is no public reset endpoint.
router.get('/me', authenticateJWT, getMe);
router.patch('/me', authenticateJWT, updateMe);
router.post('/change-password', authenticateJWT, changePassword);

export default router;
