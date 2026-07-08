import { Router } from 'express';
import { getTrips, getTripById, createTrip, updateTripStatus, approveDriverPayment } from '../controllers/tripController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', getTrips);
router.post('/', createTrip);
router.get('/:id', getTripById);
router.patch('/:id/status', updateTripStatus);
router.post('/:id/payment/approve', approveDriverPayment);

export default router;
