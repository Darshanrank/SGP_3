import express from 'express';
import { getMyProfile, updateProfile, getPublicProfile, getPublicProfileByUsername, sendUpcomingReminder } from '../controllers/profile.controller.js';
import { validateTokenMiddleware } from '../middlewares/token.middleware.js';
import { uploadMiddleware } from '../middlewares/upload.middleware.js';

const router = express.Router();

router.get('/me', validateTokenMiddleware, getMyProfile);
// Allow single file upload for field 'avatar'
router.put('/me', validateTokenMiddleware, uploadMiddleware.single('avatar'), updateProfile);
router.post('/me/send-reminder', validateTokenMiddleware, sendUpcomingReminder);

router.get('/username/:username', getPublicProfileByUsername);
router.get('/:id', getPublicProfile);

export default router;
