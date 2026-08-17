import { Router } from 'express';
import {
  createSurchargeRule,
  getSurchargeRules,
  getSurchargeRuleById,
  updateSurchargeRule,
  deleteSurchargeRule,
  getDistinctChargeTypes,
} from '../controllers/surchargeRuleController';
import { authenticateJWT } from '../middlewares/auth';
import { authorizeRoles } from '../middlewares/rbac';

const router = Router();

router.use(authenticateJWT);
router.use(authorizeRoles('Admin', 'Operator'));

// Must stay above '/:id' — otherwise Express matches "charge-types" as an id.
router.get('/charge-types', getDistinctChargeTypes);

router.post('/', createSurchargeRule);
router.get('/', getSurchargeRules);
router.get('/:id', getSurchargeRuleById);
router.put('/:id', updateSurchargeRule);
router.delete('/:id', deleteSurchargeRule);

export default router;
