import { Router } from 'express';
import { getDriverDocuments, getDriverTripPhotos } from '../controllers/mobileDocumentController';
import { getAssignedVehicle } from '../controllers/mobileVehicleController';
import { authenticateJWT } from '../middlewares/auth';
import { authorizeRoles, requireModuleEnabled } from '../middlewares/rbac';

const router = Router();

router.use(authenticateJWT);
router.use(authorizeRoles('Driver'));

router.get('/documents', requireModuleEnabled('documents'), getDriverDocuments);
router.get('/cargo-pod-photos', getDriverTripPhotos);
router.get('/vehicle', getAssignedVehicle);

export default router;
