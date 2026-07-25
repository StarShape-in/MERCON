import { Router } from 'express';
import { raiseEmergency } from '../controllers/mobileEmergencyController';
import { authenticateJWT } from '../middlewares/auth';
import { authorizeRoles } from '../middlewares/rbac';

const router = Router();

router.use(authenticateJWT);
router.use(authorizeRoles('Driver'));

router.post('/', raiseEmergency);

export default router;
