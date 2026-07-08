import { Router } from 'express';
import { getMaintenanceRecords, createMaintenanceRecord } from '../controllers/maintenanceController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', getMaintenanceRecords);
router.post('/', createMaintenanceRecord);

export default router;
