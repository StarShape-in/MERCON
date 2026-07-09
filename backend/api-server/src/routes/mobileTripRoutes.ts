import { Router } from 'express';
import { getCurrentTrip, updateTripStatus } from '../controllers/mobileTripController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/current', getCurrentTrip);
router.post('/:id/status', updateTripStatus);

export default router;
