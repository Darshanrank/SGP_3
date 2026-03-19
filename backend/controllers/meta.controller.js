import { 
    getNotificationsService, 
    markNotificationReadService, 
    markNotificationUnreadService,
    getDashboardStatsService, 
    reportUserService, 
    getCalendarEventsService, 
    createCalendarEventService,
    getBadgesService,
    getMyBadgesService,
    createBadgeService,
    assignBadgeService,
    getMyRewardsService,
    getMyReportsService,
    getReportsService,
    updateReportStatusService,
    createPenaltyService,
    getMyPenaltiesService,
    getPenaltiesService,
    markAllNotificationsReadService,
    getUnreadCountService,
    getLeaderboardService,
    getSkillCategoriesService
} from '../services/meta.service.js';
import { ValidationError } from '../errors/generic.errors.js';

// Get Notifications
export const getNotifications = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const page = Number.parseInt(req.query.page, 10) || 1;
        const limit = Number.parseInt(req.query.limit, 10) || 20;
        const isRead = req.query.isRead;
        const notifications = await getNotificationsService(userId, { page, limit, isRead });
        res.json(notifications);
    } catch (error) {
        next(error);
    }
};

export const getUnreadCount = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const count = await getUnreadCountService(userId);
        res.json(count);
    } catch (error) {
        next(error);
    }
};

// Mark Notification Read
export const markNotificationRead = async (req, res, next) => {
    try {
        const id = Number.parseInt(req.params.id, 10);
        const userId = req.user.userId;
        if (!Number.isInteger(id)) {
            throw new ValidationError('Invalid notification id', 'INVALID_NOTIFICATION_ID');
        }
        await markNotificationReadService(userId, id);
        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        next(error);
    }
};

export const markNotificationUnread = async (req, res, next) => {
    try {
        const id = Number.parseInt(req.params.id, 10);
        const userId = req.user.userId;
        if (!Number.isInteger(id)) {
            throw new ValidationError('Invalid notification id', 'INVALID_NOTIFICATION_ID');
        }
        await markNotificationUnreadService(userId, id);
        res.json({ message: 'Notification marked as unread' });
    } catch (error) {
        next(error);
    }
};

export const markAllNotificationsRead = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const result = await markAllNotificationsReadService(userId);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

// Get Dashboard Stats (Rewards, Badges)
export const getDashboardStats = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const stats = await getDashboardStatsService(userId);
        res.json(stats);
    } catch (error) {
        next(error);
    }
};

// Report User
export const reportUser = async (req, res, next) => {
    try {
        const reporterId = req.user.userId;
        const report = await reportUserService(reporterId, req.body);
        res.status(201).json(report);
    } catch (error) {
        next(error);
    }
};

// Get Calendar Events
export const getCalendarEvents = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const page = Number.parseInt(req.query.page, 10) || 1;
        const limit = Number.parseInt(req.query.limit, 10) || 20;
        const from = req.query.from;
        const to = req.query.to;
        const events = await getCalendarEventsService(userId, { page, limit, from, to });
        res.json(events);
    } catch (error) {
        next(error);
    }
};

export const createCalendarEvent = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const event = await createCalendarEventService(userId, req.body);
        res.status(201).json(event);
    } catch (error) {
        next(error);
    }
};

// Badges
export const getBadges = async (_req, res, next) => {
    try {
        const badges = await getBadgesService();
        res.json(badges);
    } catch (error) {
        next(error);
    }
};

export const getMyBadges = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const badges = await getMyBadgesService(userId);
        res.json(badges);
    } catch (error) {
        next(error);
    }
};

export const createBadge = async (req, res, next) => {
    try {
        const badge = await createBadgeService(req.body);
        res.status(201).json(badge);
    } catch (error) {
        next(error);
    }
};

export const assignBadge = async (req, res, next) => {
    try {
        const result = await assignBadgeService(req.body);
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
};

export const getMyRewards = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const rewards = await getMyRewardsService(userId);
        res.json(rewards);
    } catch (error) {
        next(error);
    }
};

// Reports
export const getMyReports = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const reports = await getMyReportsService(userId);
        res.json(reports);
    } catch (error) {
        next(error);
    }
};

export const getReports = async (req, res, next) => {
    try {
        const page = Number.parseInt(req.query.page, 10) || 1;
        const limit = Number.parseInt(req.query.limit, 10) || 20;
        const status = req.query.status;
        const reports = await getReportsService({ page, limit, status });
        res.json(reports);
    } catch (error) {
        next(error);
    }
};

export const updateReportStatus = async (req, res, next) => {
    try {
        const reportId = Number.parseInt(req.params.id, 10);
        if (!Number.isInteger(reportId)) {
            throw new ValidationError('Invalid report id', 'INVALID_REPORT_ID');
        }
        const report = await updateReportStatusService(reportId, req.body);
        res.json(report);
    } catch (error) {
        next(error);
    }
};

// Penalties
export const createPenalty = async (req, res, next) => {
    try {
        const penalty = await createPenaltyService(req.body);
        res.status(201).json(penalty);
    } catch (error) {
        next(error);
    }
};

export const getMyPenalties = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const penalties = await getMyPenaltiesService(userId);
        res.json(penalties);
    } catch (error) {
        next(error);
    }
};

export const getPenalties = async (req, res, next) => {
    try {
        const page = Number.parseInt(req.query.page, 10) || 1;
        const limit = Number.parseInt(req.query.limit, 10) || 20;
        const penalties = await getPenaltiesService({ page, limit });
        res.json(penalties);
    } catch (error) {
        next(error);
    }
};

// Leaderboard
export const getLeaderboard = async (req, res, next) => {
    try {
        const page = Number.parseInt(req.query.page, 10) || 1;
        const limit = Number.parseInt(req.query.limit, 10) || 20;
        const leaderboard = await getLeaderboardService({ page, limit });
        res.json(leaderboard);
    } catch (error) {
        next(error);
    }
};

// Skill Categories
export const getSkillCategories = async (_req, res, next) => {
    try {
        const categories = await getSkillCategoriesService();
        res.json(categories);
    } catch (error) {
        next(error);
    }
};
