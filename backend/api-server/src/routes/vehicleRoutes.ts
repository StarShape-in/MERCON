import { Router } from 'express';
import { getVehicles, getVehicleById, createVehicle } from '../controllers/vehicleController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', getVehicles);
router.get('/:id', getVehicleById);
router.post('/', createVehicle);

export default router;
