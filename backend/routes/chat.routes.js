import express from 'express';
import { getMessages, sendMessage } from '../controllers/chat.controller.js';
import { validateTokenMiddleware } from '../middlewares/token.middleware.js';
import { validateMessageInput } from '../middlewares/validation.middleware.js';

const router = express.Router();

router.use(validateTokenMiddleware);

router.get('/:classId', getMessages);
router.post('/:classId', validateMessageInput, sendMessage);

export default router;
