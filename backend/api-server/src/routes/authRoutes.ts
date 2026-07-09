import { Router } from 'express';
import { login, getMe } from '../controllers/authController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

// Unified login for all roles (Admin, Operator, Driver)
router.post('/login', login);

// Get current authenticated user profile
router.get('/me', authenticateJWT, getMe);

export default router;
