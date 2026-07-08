import { Router } from 'express';
import { getInvoices, createInvoice } from '../controllers/invoiceController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', getInvoices);
router.post('/', createInvoice);

export default router;
