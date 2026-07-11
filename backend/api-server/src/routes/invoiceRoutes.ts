import { Router } from 'express';
import { getInvoices, getInvoiceById, createInvoice, updateInvoiceStatus , bulkDeleteInvoices, bulkUpdateInvoiceStatus} from '../controllers/invoiceController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.use(authenticateJWT);
router.post('/bulk-delete', bulkDeleteInvoices);
router.post('/bulk-update-status', bulkUpdateInvoiceStatus);


router.get('/', getInvoices);
router.post('/', createInvoice);
router.get('/:id', getInvoiceById);
router.patch('/:id/status', updateInvoiceStatus);

export default router;
