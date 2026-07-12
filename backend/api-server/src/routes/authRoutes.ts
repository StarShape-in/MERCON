import { Router } from 'express';
import { login, getMe, updateMe, changePassword, requestPasswordReset } from '../controllers/authController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

// Unified login for all roles (Admin, Operator, Driver)
router.post('/login', login);

// Forgotten passwords are reset by an operator/admin (no self-service reset).
// This just notifies all Admins + Operators that someone needs a reset.
router.post('/request-reset', requestPasswordReset);

// Authenticated profile management
router.get('/me', authenticateJWT, getMe);
router.patch('/me', authenticateJWT, updateMe);
router.post('/change-password', authenticateJWT, changePassword);

export default router;
