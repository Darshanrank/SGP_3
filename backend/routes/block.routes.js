import express from 'express';
import { validateTokenMiddleware } from '../middlewares/token.middleware.js';
import {
    blockUserController,
    getBlockStatusController,
    getMyBlockedUsersController,
    unblockUserController,
} from '../controllers/block.controller.js';

const blockRouter = express.Router();

blockRouter.post('/', validateTokenMiddleware, blockUserController);
blockRouter.delete('/:userId', validateTokenMiddleware, unblockUserController);
blockRouter.get('/status/:userId', validateTokenMiddleware, getBlockStatusController);
blockRouter.get('/me', validateTokenMiddleware, getMyBlockedUsersController);

export default blockRouter;
