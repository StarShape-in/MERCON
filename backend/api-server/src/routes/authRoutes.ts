import { Router } from 'express';
import { login, getMe, updateMe, changePassword, forgotPassword, resetPassword } from '../controllers/authController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

// Unified login for all roles (Admin, Operator, Driver)
router.post('/login', login);

// Self-service password reset (not authenticated)
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Authenticated profile management
router.get('/me', authenticateJWT, getMe);
router.patch('/me', authenticateJWT, updateMe);
router.post('/change-password', authenticateJWT, changePassword);

export default router;
