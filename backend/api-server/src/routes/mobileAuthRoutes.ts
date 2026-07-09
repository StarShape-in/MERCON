import { Router } from 'express';
import { mobileLogin } from '../controllers/mobileAuthController';

const router = Router();

router.post('/login', mobileLogin);

export default router;
