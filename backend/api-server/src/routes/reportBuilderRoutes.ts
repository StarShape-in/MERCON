import { Router } from 'express';
import { authenticateJWT } from '../middlewares/auth';
import { authorizeRoles } from '../middlewares/rbac';
import { validate } from '../middlewares/validate';
import {
  reportQuerySpecBody,
  createSavedReportBody,
  createScheduledReportBody,
  updateScheduledReportBody,
} from '../schemas';
import {
  getReportSchema,
  executeReportQuery,
  listSavedReports,
  createSavedReport,
  deleteSavedReport,
  listScheduledReports,
  createScheduledReport,
  updateScheduledReport,
  deleteScheduledReport,
} from '../controllers/reportBuilderController';

const router = Router();

router.use(authenticateJWT);
router.use(authorizeRoles('Admin', 'Operator'));

// Metadata schema endpoint
router.get('/schema', getReportSchema);

// Execute query
router.post('/query', validate({ body: reportQuerySpecBody }), executeReportQuery);

// Saved reports CRUD
router.get('/saved', listSavedReports);
router.post('/saved', validate({ body: createSavedReportBody }), createSavedReport);
router.delete('/saved/:id', deleteSavedReport);

// Scheduled reports CRUD
router.get('/scheduled', listScheduledReports);
router.post('/scheduled', validate({ body: createScheduledReportBody }), createScheduledReport);
router.put('/scheduled/:id', validate({ body: updateScheduledReportBody }), updateScheduledReport);
router.delete('/scheduled/:id', deleteScheduledReport);

export default router;
