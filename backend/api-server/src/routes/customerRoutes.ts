import { Router } from 'express';
import { getCustomers, getCustomerById, createCustomer } from '../controllers/customerController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.post('/', createCustomer);

export default router;
