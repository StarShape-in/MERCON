import { Router } from 'express';
import {
  getThirdPartyProviders,
  getThirdPartyProviderById,
  createThirdPartyProvider,
  updateThirdPartyProvider,
  deleteThirdPartyProvider,
} from '../controllers/thirdPartyController';

const router = Router();

router.get('/', getThirdPartyProviders);
router.get('/:id', getThirdPartyProviderById);
router.post('/', createThirdPartyProvider);
router.put('/:id', updateThirdPartyProvider);
router.delete('/:id', deleteThirdPartyProvider);

export default router;
