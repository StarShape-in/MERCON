import { Router } from 'express';
import {
  createSurchargeRule,
  getSurchargeRules,
  getSurchargeRuleById,
  updateSurchargeRule,
  deleteSurchargeRule,
  getDistinctChargeTypes,
  bulkImportSurchargeRules,
} from '../controllers/surchargeRuleController';
import { authenticateJWT } from '../middlewares/auth';
import { authorizeRoles } from '../middlewares/rbac';
import { validate } from '../middlewares/validate';
import { bulkImportSurchargeRulesBody } from '../schemas';

const router = Router();

router.use(authenticateJWT);
router.use(authorizeRoles('Admin', 'Operator'));

// Must stay above '/:id' — otherwise Express matches "charge-types" as an id.
router.get('/charge-types', getDistinctChargeTypes);
router.post('/import', validate({ body: bulkImportSurchargeRulesBody }), bulkImportSurchargeRules);

router.post('/', createSurchargeRule);
router.get('/', getSurchargeRules);
router.get('/:id', getSurchargeRuleById);
router.put('/:id', updateSurchargeRule);
router.delete('/:id', deleteSurchargeRule);

export default router;
