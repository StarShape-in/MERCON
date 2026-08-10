import { Router } from 'express';
import { 
  getMaintenanceRecords, 
  getMaintenanceRecordById,
  createMaintenanceRecord, 
  updateMaintenanceRecord,
  deleteMaintenanceRecord,
  returnVehicleToService,
  getWorkshops
} from '../controllers/maintenanceController';
import { authenticateJWT } from '../middlewares/auth';
import { authorizeRoles } from '../middlewares/rbac';

const router = Router();

router.use(authenticateJWT);
router.use(authorizeRoles('Admin', 'Operator'));

router.get('/', getMaintenanceRecords);
// Must stay above '/:id', otherwise "workshops" is read as a record id.
router.get('/workshops', getWorkshops);
router.get('/:id', getMaintenanceRecordById);
router.post('/', createMaintenanceRecord);
// Closes a vehicle's open service orders — declared before nothing else matches POST /:id,
// so ordering is not load-bearing, but keep it next to the other write routes.
router.post('/vehicles/:vehicleId/return-to-service', returnVehicleToService);
router.patch('/:id', updateMaintenanceRecord);
router.delete('/:id', deleteMaintenanceRecord);

export default router;
