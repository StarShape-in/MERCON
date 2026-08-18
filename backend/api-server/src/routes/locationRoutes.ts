import { Router } from 'express';
import {
  getLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
  bulkImportLocations,
} from '../controllers/locationController';
import { authenticateJWT } from '../middlewares/auth';
import { authorizeRoles } from '../middlewares/rbac';
import { validate } from '../middlewares/validate';
import { bulkImportLocationsBody } from '../schemas';

const router = Router();

router.use(authenticateJWT);
router.use(authorizeRoles('Admin', 'Operator'));

router.get('/', getLocations);
router.post('/', createLocation);
// City/lane-endpoint workbook import — rows are parsed from the .xlsx in the
// browser and posted as JSON, same contract as /rate-cards/import.
router.post('/import', validate({ body: bulkImportLocationsBody }), bulkImportLocations);
router.get('/:id', getLocationById);
router.put('/:id', updateLocation);
router.delete('/:id', deleteLocation);

export default router;
