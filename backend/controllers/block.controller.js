import {
    blockUserService,
    getBlockStatusService,
    getMyBlockedUsersService,
    unblockUserService,
} from '../services/block.service.js';

export const blockUserController = async (req, res, next) => {
    try {
        const blockerId = req.user.userId;
        const blockedUserId = Number(req.body?.blockedUserId);

        const result = await blockUserService(blockerId, blockedUserId);
        res.status(201).json({ success: true, message: 'User blocked', data: result });
    } catch (err) {
        next(err);
    }
};

export const unblockUserController = async (req, res, next) => {
    try {
        const blockerId = req.user.userId;
        const blockedUserId = Number(req.params?.userId);

        const result = await unblockUserService(blockerId, blockedUserId);
        res.status(200).json({ success: true, message: 'User unblocked', data: result });
    } catch (err) {
        next(err);
    }
};

export const getBlockStatusController = async (req, res, next) => {
    try {
        const requesterId = req.user.userId;
        const otherUserId = Number(req.params?.userId);

        const status = await getBlockStatusService(requesterId, otherUserId);
        res.status(200).json({ success: true, data: status });
    } catch (err) {
        next(err);
    }
};

export const getMyBlockedUsersController = async (req, res, next) => {
    try {
        const blockerId = req.user.userId;
        const result = await getMyBlockedUsersService(blockerId);
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};
