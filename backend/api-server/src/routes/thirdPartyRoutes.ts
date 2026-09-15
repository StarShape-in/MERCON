import { Router } from 'express';
import {
  getThirdPartyProviders,
  getThirdPartyProviderById,
  createThirdPartyProvider,
  updateThirdPartyProvider,
  deleteThirdPartyProvider,
  bulkImportThirdPartyProviders,
  getThirdPartyStats,
  getProviderRates,
  createProviderRateCard,
  updateProviderRateCard,
  deleteProviderRateCard,
  matchProviderRateCard,
} from '../controllers/thirdPartyController';
import { authenticateJWT } from '../middlewares/auth';
import { authorizeRoles } from '../middlewares/rbac';

const router = Router();

// Protect all third-party provider routes
router.use(authenticateJWT);
router.use(authorizeRoles('Admin', 'Operator'));

router.get('/', getThirdPartyProviders);
// Before `/:id` so the literal path isn't captured as an id.
router.get('/stats', getThirdPartyStats);
router.post('/rates/match', matchProviderRateCard);
router.put('/rates/:id', updateProviderRateCard);
router.delete('/rates/:id', deleteProviderRateCard);
router.get('/:providerId/rates', getProviderRates);
router.post('/:providerId/rates', createProviderRateCard);
router.get('/:id', getThirdPartyProviderById);
router.post('/', createThirdPartyProvider);
router.post('/import', bulkImportThirdPartyProviders);
router.put('/:id', updateThirdPartyProvider);
router.delete('/:id', deleteThirdPartyProvider);

export default router;

