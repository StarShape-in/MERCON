import { Router } from 'express';
import { getDrivers, getDriverById, createDriver, updateDriver, deleteDriver } from '../controllers/driverController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

// Protect all driver routes
router.use(authenticateJWT);

router.get('/', getDrivers);
router.post('/', createDriver);
router.get('/:id', getDriverById);
router.patch('/:id', updateDriver);
router.delete('/:id', deleteDriver);

export default router;
