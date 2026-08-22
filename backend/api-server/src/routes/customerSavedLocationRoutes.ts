import { Router } from 'express';
import {
  getCustomerSavedLocations,
  createCustomerSavedLocation,
  deleteCustomerSavedLocation,
  bulkImportCustomerSavedLocations,
  updateCustomerSavedLocation,
} from '../controllers/customerSavedLocationController';
import { authenticateJWT } from '../middlewares/auth';
import { authorizeRoles } from '../middlewares/rbac';
import { validate } from '../middlewares/validate';
import { bulkImportCustomerSavedLocationsBody } from '../schemas';

const router = Router();

router.use(authenticateJWT);
router.use(authorizeRoles('Admin', 'Operator'));

router.post('/import', validate({ body: bulkImportCustomerSavedLocationsBody }), bulkImportCustomerSavedLocations);
router.get('/', getCustomerSavedLocations);
router.post('/', createCustomerSavedLocation);
router.put('/:id', updateCustomerSavedLocation);
router.delete('/:id', deleteCustomerSavedLocation);

export default router;
