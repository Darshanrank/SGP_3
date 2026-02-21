import { ForbiddenError } from '../errors/generic.errors.js';
import { conf } from '../conf/conf.js';

export const requireAdmin = (req, _res, next) => {
    const userId = req.user?.userId;
    if (!userId) {
        return next(new ForbiddenError('Authentication required', 'AUTH_REQUIRED'));
    }

    if (!conf.ADMIN_USER_IDS.length || !conf.ADMIN_USER_IDS.includes(userId)) {
        return next(new ForbiddenError('Admin access required', 'ADMIN_REQUIRED'));
    }

    return next();
};
