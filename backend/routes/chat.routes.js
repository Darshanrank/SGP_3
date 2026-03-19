import express from 'express';
import { getMessages, sendMessage, searchMessages, sendAttachmentMessage } from '../controllers/chat.controller.js';
import { validateTokenMiddleware } from '../middlewares/token.middleware.js';
import { validateMessageInput } from '../middlewares/validation.middleware.js';
import { uploadChatAttachmentMiddleware } from '../middlewares/upload.middleware.js';

const router = express.Router();

router.use(validateTokenMiddleware);

router.get('/:classId/messages', getMessages);
router.get('/:classId/search', searchMessages);
router.post('/:classId/messages', validateMessageInput, sendMessage);
router.post('/:classId/attachments', uploadChatAttachmentMiddleware.single('attachment'), sendAttachmentMessage);

// Backward-compatible endpoints
router.get('/:classId', getMessages);
router.post('/:classId', validateMessageInput, sendMessage);

export default router;
