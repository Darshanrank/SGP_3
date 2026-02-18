import express from 'express';
import { getMessages, sendMessage } from '../controllers/chat.controller.js';
import { validateTokenMiddleware } from '../middlewares/token.middleware.js';

const router = express.Router();

router.use(validateTokenMiddleware);

router.get('/:classId', getMessages);
router.post('/:classId', sendMessage);

export default router;
