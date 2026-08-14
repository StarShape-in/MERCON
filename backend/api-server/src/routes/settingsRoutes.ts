import { Router } from 'express';
import { getPublicSettings, getSettings, updateSettings } from '../controllers/settingsController';
import { authenticateJWT } from '../middlewares/auth';
import { requireSuperAdmin } from '../middlewares/rbac';

const router = Router();

// Unauthenticated: the login page needs branding before anyone is signed in.
// Deliberately returns only appName/logoUrl/primaryColor — see controller.
router.get('/public', getPublicSettings);

router.use(authenticateJWT);
router.get('/', getSettings);
router.put('/', requireSuperAdmin, updateSettings);

export default router;
