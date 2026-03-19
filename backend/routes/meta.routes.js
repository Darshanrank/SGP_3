import express from 'express';
import { 
    getNotifications, 
    markNotificationRead, 
    markNotificationUnread,
    getDashboardStats, 
    reportUser, 
    getCalendarEvents, 
    createCalendarEvent,
    getBadges,
    getMyBadges,
    createBadge,
    assignBadge,
    getMyRewards,
    getMyReports,
    getReports,
    updateReportStatus,
    createPenalty,
    getMyPenalties,
    getPenalties,
    getUnreadCount,
    markAllNotificationsRead,
    getLeaderboard,
    getSkillCategories
} from '../controllers/meta.controller.js';
import { validateTokenMiddleware } from '../middlewares/token.middleware.js';
import { requireAdmin } from '../middlewares/admin.middleware.js';
import { validateReportInput, validateCalendarEventInput, validateBadgeInput, validateAssignBadgeInput, validatePenaltyInput } from '../middlewares/validation.middleware.js';

const router = express.Router();

router.use(validateTokenMiddleware);

// Notifications
router.get('/notifications', getNotifications);
router.get('/notifications/unread-count', getUnreadCount);
router.put('/notifications/:id/read', markNotificationRead);
router.put('/notifications/:id/unread', markNotificationUnread);
router.put('/notifications/read-all', markAllNotificationsRead);

// Dashboard / Gamification
router.get('/dashboard', getDashboardStats);
router.get('/dashboard/stats', getDashboardStats);
router.get('/leaderboard', getLeaderboard);
router.get('/skill-categories', getSkillCategories);

// Calendar
router.get('/calendar', getCalendarEvents);
router.post('/calendar', validateCalendarEventInput, createCalendarEvent);

// Reports
router.post('/report', validateReportInput, reportUser);

// Badges & Rewards
router.get('/badges', getBadges);
router.get('/badges/my', getMyBadges);
router.post('/badges', requireAdmin, validateBadgeInput, createBadge);
router.post('/badges/assign', requireAdmin, validateAssignBadgeInput, assignBadge);
router.get('/rewards', getMyRewards);

// Reports (admin)
router.get('/reports/my', getMyReports);
router.get('/reports', requireAdmin, getReports);
router.put('/reports/:id', requireAdmin, updateReportStatus);

// Penalties (admin)
router.post('/penalties', requireAdmin, validatePenaltyInput, createPenalty);
router.get('/penalties/my', getMyPenalties);
router.get('/penalties', requireAdmin, getPenalties);

export default router;
