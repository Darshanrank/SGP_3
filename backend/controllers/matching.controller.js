import { getMatchedUsersService } from '../services/matching.service.js';

export const getMatchedUsers = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const page = Number.parseInt(req.query.page, 10) || 1;
        const limit = Number.parseInt(req.query.limit, 10) || 10;
        const result = await getMatchedUsersService(userId, { page, limit });
        res.json(result);
    } catch (error) {
        next(error);
    }
};
