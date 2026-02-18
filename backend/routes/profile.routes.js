import express from 'express';
import { getMyProfile, updateProfile, getPublicProfile } from '../controllers/profile.controller.js';
import { validateTokenMiddleware } from '../middlewares/token.middleware.js';

const router = express.Router();

router.use(validateTokenMiddleware);

router.get('/me', getMyProfile);
router.put('/me', updateProfile);
router.get('/:id', getPublicProfile);

export default router;
