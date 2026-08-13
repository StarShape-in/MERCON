import { Router } from 'express';
import {
  getInvoices, getInvoiceById, createInvoice, updateInvoiceStatus,
  bulkDeleteInvoices, bulkUpdateInvoiceStatus,
  markTripInvoiced, unmarkTripInvoiced, getBillingLedger, getCustomerBillingLedger
} from '../controllers/invoiceController';
import { authenticateJWT } from '../middlewares/auth';
import { authorizeRoles } from '../middlewares/rbac';
import { validate } from '../middlewares/validate';
import { createInvoiceBody, listQuery } from '../schemas';

const router = Router();

router.use(authenticateJWT);
router.use(authorizeRoles('Admin', 'Operator'));

// Bulk operations — literal paths before /:id
router.post('/bulk-delete', bulkDeleteInvoices);
router.post('/bulk-update-status', bulkUpdateInvoiceStatus);

// Billing ledger — the primary invoicing workspace
// GET /invoices/billing-ledger?customer_id=&date_from=&date_to=&invoice_status=&search=&page=&per_page=
router.get('/billing-ledger', getBillingLedger);
// GET /invoices/billing-ledger/by-customer — company-grouped summary view
router.get('/billing-ledger/by-customer', getCustomerBillingLedger);

// Standard invoice CRUD (preserved for backward compat)
router.get('/', validate({ query: listQuery }), getInvoices);
router.post('/', validate({ body: createInvoiceBody }), createInvoice);
router.get('/:id', getInvoiceById);
router.patch('/:id/status', updateInvoiceStatus);

// Mark/unmark trip invoiced — live under /invoices for auth consistency
// (trips/:id/mark-invoiced is also wired in tripRoutes for convenience)
router.post('/trips/:id/mark-invoiced', markTripInvoiced);
router.post('/trips/:id/unmark-invoiced', unmarkTripInvoiced);

export default router;
