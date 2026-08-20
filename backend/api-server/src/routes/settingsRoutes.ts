import { Router } from 'express';
import { getPublicSettings, getSettings, updateSettings, updateTimezone } from '../controllers/settingsController';
import { authenticateJWT } from '../middlewares/auth';
import { authorizeRoles, requireSuperAdmin } from '../middlewares/rbac';

const router = Router();

// Unauthenticated: the login page needs branding before anyone is signed in.
// Deliberately returns only appName/logoUrl/primaryColor — see controller.
router.get('/public', getPublicSettings);

router.use(authenticateJWT);
router.get('/', getSettings);

// Timezone is operational config the client's own Admin owns, so it gets its
// own Admin-gated route rather than riding along on the superadmin-only
// PUT / below (which still accepts timezone for a superadmin).
router.put('/timezone', authorizeRoles('Admin'), updateTimezone);

router.put('/', requireSuperAdmin, updateSettings);

export default router;
