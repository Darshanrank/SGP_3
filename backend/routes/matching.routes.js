import express from 'express';
import { getMatchedUsers } from '../controllers/matching.controller.js';
import { validateTokenMiddleware } from '../middlewares/token.middleware.js';

const router = express.Router();

router.use(validateTokenMiddleware);

// GET /api/matching - Get smart skill-matched users
router.get('/', getMatchedUsers);

export default router;
