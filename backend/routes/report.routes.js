import express from 'express';
import {
    getMyReports,
    getReports,
    reportUser,
    updateReportStatus,
    moderateReportAction,
} from '../controllers/meta.controller.js';
import { requireAdmin } from '../middlewares/admin.middleware.js';
import { validateTokenMiddleware } from '../middlewares/token.middleware.js';
import { validateReportInput } from '../middlewares/validation.middleware.js';

const reportRouter = express.Router();

reportRouter.use(validateTokenMiddleware);

reportRouter.post('/', validateReportInput, reportUser);
reportRouter.get('/my', getMyReports);
reportRouter.get('/', requireAdmin, getReports);
reportRouter.put('/:id/status', requireAdmin, updateReportStatus);
reportRouter.post('/:id/action', requireAdmin, moderateReportAction);

export default reportRouter;
