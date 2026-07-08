import { Router } from 'express';
import { requestOtp, verifyOtp } from '../controllers/authController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtp);

// Example of a protected route using JWT middleware
router.get('/me', authenticateJWT, (req, res) => {
  res.json({ success: true, data: { user: (req as any).user } });
});

export default router;
