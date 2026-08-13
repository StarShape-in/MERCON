import { Router } from 'express';
import { 
  getMaintenanceRecords, 
  getMaintenanceRecordById,
  createMaintenanceRecord, 
  updateMaintenanceRecord,
  deleteMaintenanceRecord,
  returnVehicleToService,
  getWorkshops,
  createSavedWorkshop,
  deleteSavedWorkshop,
  getSavedWorkItems,
  createSavedWorkItem,
  deleteSavedWorkItem
} from '../controllers/maintenanceController';
import { authenticateJWT } from '../middlewares/auth';
import { authorizeRoles } from '../middlewares/rbac';

const router = Router();

router.use(authenticateJWT);
router.use(authorizeRoles('Admin', 'Operator'));

router.get('/', getMaintenanceRecords);

// Workshop routes (must stay above '/:id' so 'workshops' isn't read as a UUID/ref_id)
router.get('/workshops', getWorkshops);
router.post('/workshops', createSavedWorkshop);
router.delete('/workshops/:id', deleteSavedWorkshop);

// Work Items / Service Details presets routes
router.get('/work-items', getSavedWorkItems);
router.post('/work-items', createSavedWorkItem);
router.delete('/work-items/:id', deleteSavedWorkItem);

router.get('/:id', getMaintenanceRecordById);
router.post('/', createMaintenanceRecord);
router.post('/vehicles/:vehicleId/return-to-service', returnVehicleToService);
router.patch('/:id', updateMaintenanceRecord);
router.delete('/:id', deleteMaintenanceRecord);

export default router;
