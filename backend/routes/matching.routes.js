import express from 'express';
import {
	getMatchedUsers,
	discoverUsers,
	getSavedFilters,
	createSavedFilter,
	deleteSavedFilter
} from '../controllers/matching.controller.js';
import { validateTokenMiddleware } from '../middlewares/token.middleware.js';

const router = express.Router();

router.use(validateTokenMiddleware);

// GET /api/matching - Get smart skill-matched users
router.get('/', getMatchedUsers);
router.get('/discover', discoverUsers);

router.get('/filters', getSavedFilters);
router.post('/filters', createSavedFilter);
router.delete('/filters/:id', deleteSavedFilter);

export default router;
