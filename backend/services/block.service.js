import prisma from '../prisma/client.js';
import { ForbiddenError, NotFound, ValidationError } from '../errors/generic.errors.js';

export const areUsersBlocked = async (userAId, userBId) => {
    if (!Number.isInteger(userAId) || !Number.isInteger(userBId)) return false;

    const relation = await prisma.blockedUser.findFirst({
        where: {
            OR: [
                { blockerId: userAId, blockedUserId: userBId },
                { blockerId: userBId, blockedUserId: userAId }
            ]
        }
    });

    return Boolean(relation);
};

export const assertUsersNotBlocked = async (userAId, userBId) => {
    const blocked = await areUsersBlocked(userAId, userBId);
    if (blocked) {
        throw new ForbiddenError('This user is blocked.', 'USER_BLOCKED');
    }
};

export const getBlockStatusService = async (requesterId, targetUserId) => {
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
        throw new ValidationError('Invalid user id', 'INVALID_USER_ID');
    }

    if (requesterId === targetUserId) {
        return {
            isBlockedByMe: false,
            hasBlockedMe: false,
            isEitherBlocked: false,
            isBlocking: false,
            isBlockedBy: false,
            blocked: false
        };
    }

    const relations = await prisma.blockedUser.findMany({
        where: {
            OR: [
                { blockerId: requesterId, blockedUserId: targetUserId },
                { blockerId: targetUserId, blockedUserId: requesterId }
            ]
        }
    });

    const isBlockedByMe = relations.some((r) => r.blockerId === requesterId && r.blockedUserId === targetUserId);
    const hasBlockedMe = relations.some((r) => r.blockerId === targetUserId && r.blockedUserId === requesterId);

    return {
        isBlockedByMe,
        hasBlockedMe,
        isEitherBlocked: isBlockedByMe || hasBlockedMe,
        isBlocking: isBlockedByMe,
        isBlockedBy: hasBlockedMe,
        blocked: isBlockedByMe || hasBlockedMe
    };
};

export const blockUserService = async (blockerId, blockedUserId) => {
    if (!Number.isInteger(blockedUserId) || blockedUserId <= 0) {
        throw new ValidationError('Invalid user id', 'INVALID_USER_ID');
    }

    if (blockerId === blockedUserId) {
        throw new ValidationError('You cannot block yourself.');
    }

    const user = await prisma.users.findUnique({ where: { userId: blockedUserId } });
    if (!user) {
        throw new NotFound('User not found');
    }

    await prisma.blockedUser.upsert({
        where: {
            blockerId_blockedUserId: {
                blockerId,
                blockedUserId
            }
        },
        update: {},
        create: {
            blockerId,
            blockedUserId
        }
    });

    return { message: 'User blocked successfully.' };
};

export const unblockUserService = async (blockerId, blockedUserId) => {
    if (!Number.isInteger(blockedUserId) || blockedUserId <= 0) {
        throw new ValidationError('Invalid user id', 'INVALID_USER_ID');
    }

    await prisma.blockedUser.deleteMany({
        where: {
            blockerId,
            blockedUserId
        }
    });

    return { message: 'User unblocked successfully.' };
};

export const getMyBlockedUsersService = async (blockerId) => {
    return prisma.blockedUser.findMany({
        where: { blockerId },
        include: {
            blockedUser: {
                select: {
                    userId: true,
                    username: true,
                    profile: {
                        select: {
                            fullName: true,
                            avatarUrl: true
                        }
                    }
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
};
