import { getCommunityStatsService } from '../services/stats.service.js';

export const getCommunityStats = async (_req, res, next) => {
    try {
        const stats = await getCommunityStatsService();
        res.json(stats);
    } catch (error) {
        next(error);
    }
};
