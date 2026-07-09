import { Router } from 'express';
import { getInvoices, getInvoiceById, createInvoice, updateInvoiceStatus } from '../controllers/invoiceController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', getInvoices);
router.post('/', createInvoice);
router.get('/:id', getInvoiceById);
router.patch('/:id/status', updateInvoiceStatus);

export default router;
