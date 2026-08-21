import { Router } from 'express';
import { getCurrentTrip, getTripHistory, getScheduledTrips, updateTripStatus, uploadTripPhoto, getTripRoute } from '../controllers/mobileTripController';
import { authenticateJWT } from '../middlewares/auth';
import { authorizeRoles } from '../middlewares/rbac';
import { upload } from '../middlewares/upload';

const router = Router();

router.use(authenticateJWT);
router.use(authorizeRoles('Driver'));

router.get('/current', getCurrentTrip);
router.get('/history', getTripHistory);
router.get('/scheduled', getScheduledTrips);
// Road route to the trip's next stop. Provider-neutral: the app asks MERCON,
// MERCON asks whichever routing provider is configured.
router.get('/:id/route', getTripRoute);
router.post('/:id/status', updateTripStatus);
router.post('/:id/photo', upload.single('file'), uploadTripPhoto);

export default router;
