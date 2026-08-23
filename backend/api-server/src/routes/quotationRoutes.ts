import { Router } from 'express';
import {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotation,
  deleteQuotation,
  lookupQuotation,
  bulkDeleteQuotations,
  bulkImportQuotations,
  getQuotationHistory,
} from '../controllers/quotationController';
import { authenticateJWT } from '../middlewares/auth';
import { authorizeRoles } from '../middlewares/rbac';

const router = Router();

// All Quotation routes are protected
router.use(authenticateJWT);
router.use(authorizeRoles('Admin', 'Operator'));

router.post('/bulk-delete', bulkDeleteQuotations);
router.post('/import', bulkImportQuotations);

// Must stay above '/:id' — otherwise Express matches "lookup" as an id.
router.get('/lookup', lookupQuotation);

router.post('/', createQuotation);
router.get('/', getQuotations);
router.get('/:id', getQuotationById);
router.get('/:id/history', getQuotationHistory);
router.put('/:id', updateQuotation);
router.delete('/:id', deleteQuotation);

export default router;
