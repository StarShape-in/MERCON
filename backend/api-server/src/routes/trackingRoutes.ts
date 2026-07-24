import { Router } from 'express';
import { pingLocation, reportEmergency } from '../controllers/trackingController';
import { authenticateJWT } from '../middlewares/auth';
import { authorizeRoles } from '../middlewares/rbac';

const router = Router();

router.use(authenticateJWT);
router.use(authorizeRoles('Driver'));

router.post('/ping', pingLocation);
router.post('/trips/:id/emergency', reportEmergency);

export default router;
