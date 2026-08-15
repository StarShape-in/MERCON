import { Router } from 'express';
import {
  getInvoices, getInvoiceById, createInvoice, updateInvoiceStatus,
  bulkDeleteInvoices, bulkUpdateInvoiceStatus,
  markTripInvoiced, unmarkTripInvoiced, getBillingLedger, getCustomerBillingLedger
} from '../controllers/invoiceController';
import { authenticateJWT } from '../middlewares/auth';
import { authorizeRoles, requireModuleEnabled } from '../middlewares/rbac';
import { validate } from '../middlewares/validate';
import { createInvoiceBody, listQuery } from '../schemas';

const router = Router();

router.use(authenticateJWT);
router.use(authorizeRoles('Admin', 'Operator'));
router.use(requireModuleEnabled('invoices'));

// Bulk operations — literal paths before /:id
router.post('/bulk-delete', (req, res) => bulkDeleteInvoices(req, res));
router.post('/bulk-update-status', (req, res) => bulkUpdateInvoiceStatus(req, res));

// Billing ledger — the primary invoicing workspace
// GET /invoices/billing-ledger?customer_id=&date_from=&date_to=&invoice_status=&search=&page=&per_page=
router.get('/billing-ledger', (req, res) => getBillingLedger(req, res));
// GET /invoices/billing-ledger/by-customer — company-grouped summary view
router.get('/billing-ledger/by-customer', (req, res) => getCustomerBillingLedger(req, res));

// Standard invoice CRUD (preserved for backward compat)
router.get('/', validate({ query: listQuery }), (req, res) => getInvoices(req, res));
router.post('/', validate({ body: createInvoiceBody }), (req, res) => createInvoice(req, res));
router.get('/:id', (req, res) => getInvoiceById(req, res));
router.patch('/:id/status', (req, res) => updateInvoiceStatus(req, res));

// Mark/unmark trip invoiced — live under /invoices for auth consistency
// (trips/:id/mark-invoiced is also wired in tripRoutes for convenience)
router.post('/trips/:id/mark-invoiced', (req, res) => markTripInvoiced(req, res));
router.post('/trips/:id/unmark-invoiced', (req, res) => unmarkTripInvoiced(req, res));

export default router;
