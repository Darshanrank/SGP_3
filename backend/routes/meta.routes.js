import express from 'express';
import { 
    getNotifications, 
    markNotificationRead, 
    markNotificationUnread,
    getDashboardStats, 
    reportUser, 
    getCalendarEvents, 
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    getBadges,
    getMyBadges,
    createBadge,
    assignBadge,
    getMyRewards,
    getRewardsHistory,
    getMyReports,
    getReports,
    updateReportStatus,
    moderateReportAction,
    createPenalty,
    getMyPenalties,
    getPenalties,
    getUnreadCount,
    markAllNotificationsRead,
    getLeaderboard,
    getSkillCategories,
    deleteNotification,
    clearNotificationHistory,
    getNotificationPreferences,
    updateNotificationPreferences,
    getPushPublicKey,
    savePushSubscription,
    removePushSubscription,
    getMyAvailability,
    createAvailabilitySlot,
    updateAvailabilitySlot,
    deleteAvailabilitySlot
} from '../controllers/meta.controller.js';
import { validateTokenMiddleware } from '../middlewares/token.middleware.js';
import { requireAdmin } from '../middlewares/admin.middleware.js';
import { validateReportInput, validateCalendarEventInput, validateCalendarEventUpdateInput, validateBadgeInput, validateAssignBadgeInput, validatePenaltyInput, validateAvailabilitySlotInput } from '../middlewares/validation.middleware.js';

const router = express.Router();

router.use(validateTokenMiddleware);

// Notifications
router.get('/notifications', getNotifications);
router.get('/notifications/unread-count', getUnreadCount);
router.get('/notifications/preferences', getNotificationPreferences);
router.put('/notifications/preferences', updateNotificationPreferences);
router.get('/notifications/push-public-key', getPushPublicKey);
router.post('/notifications/push-subscriptions', savePushSubscription);
router.delete('/notifications/push-subscriptions', removePushSubscription);
router.put('/notifications/:id/read', markNotificationRead);
router.put('/notifications/:id/unread', markNotificationUnread);
router.delete('/notifications/:id', deleteNotification);
router.put('/notifications/read-all', markAllNotificationsRead);
router.delete('/notifications', clearNotificationHistory);

// Dashboard / Gamification
router.get('/dashboard', getDashboardStats);
router.get('/dashboard/stats', getDashboardStats);
router.get('/leaderboard', getLeaderboard);
router.get('/skill-categories', getSkillCategories);

// Calendar
router.get('/calendar', getCalendarEvents);
router.post('/calendar', validateCalendarEventInput, createCalendarEvent);
router.put('/calendar/:id', validateCalendarEventUpdateInput, updateCalendarEvent);
router.delete('/calendar/:id', deleteCalendarEvent);

// Availability
router.get('/availability', getMyAvailability);
router.post('/availability', validateAvailabilitySlotInput, createAvailabilitySlot);
router.put('/availability/:slotId', validateAvailabilitySlotInput, updateAvailabilitySlot);
router.delete('/availability/:slotId', deleteAvailabilitySlot);

// Reports
router.post('/report', validateReportInput, reportUser);

// Badges & Rewards
router.get('/badges', getBadges);
router.get('/badges/my', getMyBadges);
router.post('/badges', requireAdmin, validateBadgeInput, createBadge);
router.post('/badges/assign', requireAdmin, validateAssignBadgeInput, assignBadge);
router.get('/rewards', getMyRewards);
router.get('/rewards/history', getRewardsHistory);

// Reports (admin)
router.get('/reports/my', getMyReports);
router.get('/reports', requireAdmin, getReports);
router.put('/reports/:id', requireAdmin, updateReportStatus);
router.post('/reports/:id/action', requireAdmin, moderateReportAction);

// Penalties (admin)
router.post('/penalties', requireAdmin, validatePenaltyInput, createPenalty);
router.get('/penalties/my', getMyPenalties);
router.get('/penalties', requireAdmin, getPenalties);

export default router;
