import { Router } from 'express';
import { 
  getTrips, getTripById, createTrip, updateTripStatus, approveDriverPayment,
  dispatchTrip, replaceDriver, pickupArrive, pickupVerify, deliveryVerify
, bulkDeleteTrips, bulkUpdateTripStatus} from '../controllers/tripController';
import { authenticateJWT } from '../middlewares/auth';
import { authorizeRoles } from '../middlewares/rbac';

const router = Router();

router.use(authenticateJWT);
router.use(authorizeRoles('Admin', 'Operator'));
router.post('/bulk-delete', bulkDeleteTrips);
router.post('/bulk-update-status', bulkUpdateTripStatus);


router.get('/', getTrips);
router.post('/', createTrip);
router.get('/:id', getTripById);
router.patch('/:id/status', updateTripStatus);
router.post('/:id/payment/approve', approveDriverPayment);

// Phase 1: Dispatch & Assignment
router.post('/:id/dispatch', dispatchTrip);
router.post('/:id/replace-driver', replaceDriver);

// Phase 2: Driver Workflow
router.post('/:id/pickup/arrive', pickupArrive);
router.post('/:id/pickup/verify', pickupVerify);
router.post('/:id/delivery/verify', deliveryVerify);

export default router;
