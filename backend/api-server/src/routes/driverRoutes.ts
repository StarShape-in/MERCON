import { Router } from 'express';
import { getDrivers, getDriverById, createDriver, updateDriver } from '../controllers/driverController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

// Protect all driver routes
router.use(authenticateJWT);

router.get('/', getDrivers);
router.post('/', createDriver);
router.get('/:id', getDriverById);
router.patch('/:id', updateDriver);

export default router;
