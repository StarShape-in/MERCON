import { Router } from 'express';
import { getDriverDocuments } from '../controllers/mobileDocumentController';
import { getAssignedVehicle } from '../controllers/mobileVehicleController';
import { authenticateJWT } from '../middlewares/auth';
import { authorizeRoles, requireModuleEnabled } from '../middlewares/rbac';

const router = Router();

router.use(authenticateJWT);
router.use(authorizeRoles('Driver'));

// Disabling 'documents' also stops drivers seeing their own licence/vehicle
// docs in the mobile app — same module, same toggle.
router.get('/documents', requireModuleEnabled('documents'), getDriverDocuments);
router.get('/vehicle', getAssignedVehicle);

export default router;
