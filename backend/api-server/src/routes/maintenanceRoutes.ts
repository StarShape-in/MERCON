import { Router } from 'express';
import { getMaintenanceRecords, createMaintenanceRecord } from '../controllers/maintenanceController';
import { authenticateJWT } from '../middlewares/auth';
import { authorizeRoles } from '../middlewares/rbac';

const router = Router();

router.use(authenticateJWT);
router.use(authorizeRoles('Admin', 'Operator'));

router.get('/', getMaintenanceRecords);
router.post('/', createMaintenanceRecord);

export default router;
