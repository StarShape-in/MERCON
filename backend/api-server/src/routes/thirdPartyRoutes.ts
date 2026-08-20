import { Router } from 'express';
import {
  getThirdPartyProviders,
  getThirdPartyProviderById,
  createThirdPartyProvider,
  updateThirdPartyProvider,
  deleteThirdPartyProvider,
  bulkImportThirdPartyProviders,
  getThirdPartyStats,
} from '../controllers/thirdPartyController';

const router = Router();

router.get('/', getThirdPartyProviders);
// Before `/:id` so the literal path isn't captured as an id.
router.get('/stats', getThirdPartyStats);
router.get('/:id', getThirdPartyProviderById);
router.post('/', createThirdPartyProvider);
router.post('/import', bulkImportThirdPartyProviders);
router.put('/:id', updateThirdPartyProvider);
router.delete('/:id', deleteThirdPartyProvider);

export default router;
