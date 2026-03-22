import express from 'express';
import {
    discoverUsers,
    getSavedFilters,
    createSavedFilter,
    deleteSavedFilter
} from '../controllers/matching.controller.js';
import { validateTokenMiddleware } from '../middlewares/token.middleware.js';

const router = express.Router();

router.use(validateTokenMiddleware);

router.get('/', discoverUsers);
router.get('/filters', getSavedFilters);
router.post('/filters', createSavedFilter);
router.delete('/filters/:id', deleteSavedFilter);

export default router;
