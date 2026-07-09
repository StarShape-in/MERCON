import { Router } from 'express';
import { requestOtp, verifyOtp, operatorLogin, getMe } from '../controllers/authController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

// Driver OTP flow (mobile app)
router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtp);

// Operator web dashboard login (email + password)
router.post('/operator/login', operatorLogin);

// Get current authenticated user profile (works for both driver JWT and operator JWT)
router.get('/me', authenticateJWT, getMe);

export default router;
