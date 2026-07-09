import { Router } from 'express';
import { pingLocation, reportEmergency } from '../controllers/trackingController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.use(authenticateJWT);

router.post('/ping', pingLocation);
router.post('/trips/:id/emergency', reportEmergency);

export default router;
