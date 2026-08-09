import { Router } from 'express';
import { getDrivers, getDriverById, createDriver, updateDriver, deleteDriver , bulkDeleteDrivers, bulkUpdateDriverStatus, bulkImportDrivers} from '../controllers/driverController';
import { authenticateJWT } from '../middlewares/auth';
import { authorizeRoles } from '../middlewares/rbac';
import { validate } from '../middlewares/validate';
import { createDriverBody, updateDriverBody, listQuery, bulkImportDriversBody } from '../schemas';

const router = Router();

// Protect all driver routes
router.use(authenticateJWT);
router.use(authorizeRoles('Admin', 'Operator'));
router.post('/bulk-delete', bulkDeleteDrivers);
router.post('/bulk-update-status', bulkUpdateDriverStatus);
// Fleet workbook import — rows are parsed from the .xlsx in the browser and
// posted as JSON, same contract as /trips/bulk-import.
router.post('/import', validate({ body: bulkImportDriversBody }), bulkImportDrivers);


router.get('/', validate({ query: listQuery }), getDrivers);
router.post('/', validate({ body: createDriverBody }), createDriver);
router.get('/:id', getDriverById);
router.patch('/:id', validate({ body: updateDriverBody }), updateDriver);
router.delete('/:id', deleteDriver);

export default router;
