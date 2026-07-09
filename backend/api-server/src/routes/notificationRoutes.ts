import { Router } from 'express';
import { getNotifications, markAsRead } from '../controllers/notificationController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);

export default router;
