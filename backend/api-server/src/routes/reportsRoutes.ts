import { Router } from 'express';
import { getSummary, getFleetPerformance, getDriverPerformance, getRevenueReport, getCustomReport } from '../controllers/reportsController';
import { authenticateJWT } from '../middlewares/auth';
import { authorizeRoles } from '../middlewares/rbac';

const router = Router();

router.use(authenticateJWT);
router.use(authorizeRoles('Admin', 'Operator'));

// Dashboard summary KPIs + trip distribution + monthly revenue chart
router.get('/summary', getSummary);

// Fleet utilization per vehicle
router.get('/fleet', getFleetPerformance);

// Driver performance metrics
router.get('/drivers', getDriverPerformance);

// Revenue breakdown by month
router.get('/revenue', getRevenueReport);

// Instant Custom Reports
router.get('/custom', getCustomReport);

export default router;
