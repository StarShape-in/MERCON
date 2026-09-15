import { Router } from 'express';
import { getAllCompatibilityRules, upsertCompatibilityRule } from '../controllers/vehicleCompatibilityController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', getAllCompatibilityRules);
router.post('/', upsertCompatibilityRule);
router.put('/', upsertCompatibilityRule);

export default router;
