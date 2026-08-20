import { Router } from 'express';
import { resolveMapsLink } from '../controllers/geocodingController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/resolve-maps-link', resolveMapsLink);

export default router;
