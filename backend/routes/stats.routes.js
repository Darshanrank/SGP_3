import express from 'express';
import { getCommunityStats } from '../controllers/stats.controller.js';

const router = express.Router();

router.get('/', getCommunityStats);

export default router;
