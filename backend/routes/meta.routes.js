import express from 'express';
import { 
    getNotifications, 
    markNotificationRead, 
    getDashboardStats, 
    reportUser, 
    getCalendarEvents, 
    createCalendarEvent 
} from '../controllers/meta.controller.js';
import { validateTokenMiddleware } from '../middlewares/token.middleware.js';

const router = express.Router();

router.use(validateTokenMiddleware);

// Notifications
router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markNotificationRead);

// Dashboard / Gamification
router.get('/dashboard', getDashboardStats);

// Calendar
router.get('/calendar', getCalendarEvents);
router.post('/calendar', createCalendarEvent);

// Reports
router.post('/report', reportUser);

export default router;
