import { Router } from 'express';
import { getVehicles, getVehicleById, createVehicle, updateVehicle, deleteVehicle , bulkDeleteVehicles, bulkUpdateVehicleStatus} from '../controllers/vehicleController';
import { authenticateJWT } from '../middlewares/auth';
import { authorizeRoles } from '../middlewares/rbac';

const router = Router();

router.use(authenticateJWT);
router.use(authorizeRoles('Admin', 'Operator'));
router.post('/bulk-delete', bulkDeleteVehicles);
router.post('/bulk-update-status', bulkUpdateVehicleStatus);


router.get('/', getVehicles);
router.post('/', createVehicle);
router.get('/:id', getVehicleById);
router.patch('/:id', updateVehicle);
router.delete('/:id', deleteVehicle);

export default router;
