import { 
    getNotificationsService, 
    markNotificationReadService, 
    getDashboardStatsService, 
    reportUserService, 
    getCalendarEventsService, 
    createCalendarEventService 
} from '../services/meta.service.js';

// Get Notifications
export const getNotifications = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const notifications = await getNotificationsService(userId);
        res.json(notifications);
    } catch (error) {
        next(error);
    }
};

// Mark Notification Read
export const markNotificationRead = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        await markNotificationReadService(id);
        res.json({ message: 'Notification marked as read' });
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
        const events = await getCalendarEventsService(userId);
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
