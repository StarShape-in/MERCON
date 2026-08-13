import { Router } from 'express';
import {
  getTrips, getTripById, createTrip, updateTripStatus, approveDriverPayment,
  dispatchTrip, replaceDriver, pickupArrive, pickupVerify, deliveryVerify,
  bulkDeleteTrips, bulkUpdateTripStatus, getUnsettledCompletedTrips, updateTripFinancials,
  logStopDelay, bulkImportTrips, updateTripStop, getMonthlyTripBoard
} from '../controllers/tripController';
import { markTripInvoiced, unmarkTripInvoiced } from '../controllers/invoiceController';
import { authenticateJWT } from '../middlewares/auth';
import { authorizeRoles } from '../middlewares/rbac';
import { validate } from '../middlewares/validate';
import { createTripBody, listQuery, logStopDelayBody, bulkImportTripsBody, updateTripStopBody } from '../schemas';

const router = Router();

router.use(authenticateJWT);
router.use(authorizeRoles('Admin', 'Operator'));
router.get('/unsettled', getUnsettledCompletedTrips);
// Literal paths first — `/:id` would otherwise capture "monthly" as a trip id.
// A whole month grouped company → day, for the monthly-commitment board.
router.get('/monthly', getMonthlyTripBoard);
router.post('/bulk-delete', bulkDeleteTrips);
router.post('/bulk-update-status', bulkUpdateTripStatus);
router.post('/bulk-import', validate({ body: bulkImportTripsBody }), bulkImportTrips);


router.get('/', validate({ query: listQuery }), getTrips);
router.post('/', validate({ body: createTripBody }), createTrip);
router.get('/:id', getTripById);
router.patch('/:id/status', updateTripStatus);
router.patch('/:id/financials', updateTripFinancials);
router.post('/:id/payment/approve', approveDriverPayment);

// Phase 1: Dispatch & Assignment
router.post('/:id/dispatch', dispatchTrip);
router.post('/:id/replace-driver', replaceDriver);

// Why a stop ran late — operator-filled, drivers never see this.
router.patch('/:id/stops/:stopId/delay', validate({ body: logStopDelayBody }), logStopDelay);

// Correct where a stop is (label, address, lane endpoint, pin). Allowed while
// the trip is still running — a wrong address is exactly what needs fixing
// mid-trip — and refused once it's completed, invoiced or cancelled.
router.patch('/:id/stops/:stopId', validate({ body: updateTripStopBody }), updateTripStop);

// Phase 2: Driver Workflow
router.post('/:id/pickup/arrive', pickupArrive);
router.post('/:id/pickup/verify', pickupVerify);
router.post('/:id/delivery/verify', deliveryVerify);

// Invoicing Ledger Actions — mark/unmark a completed trip as invoiced
router.post('/:id/mark-invoiced', (req, res) => markTripInvoiced(req, res));
router.post('/:id/unmark-invoiced', (req, res) => unmarkTripInvoiced(req, res));

export default router;

