import prisma from '../prisma/client.js';
import { NotFound, ValidationError } from '../errors/generic.errors.js';

export const getNotificationsService = async (userId, { page = 1, limit = 20, isRead } = {}) => {
    const skip = (page - 1) * limit;
    const where = {
        userId,
        ...(isRead !== undefined ? { isRead: isRead === 'true' || isRead === true } : {})
    };

    const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        }),
        prisma.notification.count({ where })
    ]);

    return {
        data: notifications,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
};

export const markNotificationReadService = async (userId, id) => {
    const notification = await prisma.notification.findFirst({
        where: { id, userId }
    });

    if (!notification) {
        throw new NotFound('Notification not found');
    }

    return await prisma.notification.update({
        where: { id },
        data: { isRead: true }
    });
};

export const markAllNotificationsReadService = async (userId) => {
    await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true }
    });
    return { message: 'All notifications marked as read' };
};

export const getUnreadCountService = async (userId) => {
    const count = await prisma.notification.count({ where: { userId, isRead: false } });
    return { unread: count };
};

export const getDashboardStatsService = async (userId) => {
    const [reward, badges, swapCount, teachCount, learnCount] = await Promise.all([
        prisma.userReward.findUnique({ where: { userId } }),
        prisma.userBadge.findMany({ 
            where: { userId },
            include: { badge: true }
        }),
        prisma.swapClass.count({
            where: {
                status: 'ONGOING',
                swapRequest: {
                    OR: [{ fromUserId: userId }, { toUserId: userId }]
                }
            }
        }),
        prisma.userSkill.count({ where: { userId, type: 'TEACH' } }),
        prisma.userSkill.count({ where: { userId, type: 'LEARN' } })
    ]);

    return {
        points: reward?.points || 0,
        swaps: reward?.totalSwaps || 0,
        activeSwaps: swapCount,
        teaching: teachCount,
        learning: learnCount,
        badges
    };
};

export const reportUserService = async (reporterId, data) => {
    const { reportedUserId, reason } = data;

    if (reporterId === reportedUserId) {
        throw new ValidationError('You cannot report yourself');
    }

    const reportedUser = await prisma.users.findUnique({
        where: { userId: reportedUserId }
    });

    if (!reportedUser) {
        throw new NotFound('Reported user not found');
    }

    return await prisma.report.create({
        data: {
            reporterId,
            reportedUserId,
            reason
        }
    });
};

export const getCalendarEventsService = async (userId, { page = 1, limit = 20, from, to } = {}) => {
    const skip = (page - 1) * limit;
    const dateFilter = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    const where = {
        userId,
        ...(from || to ? { eventDate: dateFilter } : {})
    };

    const [events, total] = await Promise.all([
        prisma.calendarEvent.findMany({
            where,
            orderBy: { eventDate: 'asc' },
            skip,
            take: limit
        }),
        prisma.calendarEvent.count({ where })
    ]);

    return {
        data: events,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
};

export const createCalendarEventService = async (userId, data) => {
    const { title, eventDate, description, swapClassId } = data;

    if (swapClassId) {
        const swapClass = await prisma.swapClass.findUnique({
            where: { id: swapClassId },
            include: { swapRequest: { select: { fromUserId: true, toUserId: true } } }
        });
        if (!swapClass) throw new NotFound('Swap class not found');
        const isMember = swapClass.swapRequest.fromUserId === userId || swapClass.swapRequest.toUserId === userId;
        if (!isMember) throw new ValidationError('Swap class does not belong to user');
    }

    return await prisma.calendarEvent.create({
        data: {
            userId,
            title,
            eventDate,
            description,
            swapClassId
        }
    });
};

// Badges & Rewards
export const getBadgesService = async () => {
    return await prisma.badge.findMany({ orderBy: { name: 'asc' } });
};

export const getMyBadgesService = async (userId) => {
    return await prisma.userBadge.findMany({
        where: { userId },
        include: { badge: true },
        orderBy: { earnedAt: 'desc' }
    });
};

export const createBadgeService = async (data) => {
    const { name, condition } = data;
    return await prisma.badge.create({
        data: { name, condition }
    });
};

export const assignBadgeService = async (data) => {
    const { userId, badgeId } = data;
    const badge = await prisma.badge.findUnique({ where: { id: badgeId } });
    if (!badge) throw new NotFound('Badge not found');

    const user = await prisma.users.findUnique({ where: { userId } });
    if (!user) throw new NotFound('User not found');

    const existing = await prisma.userBadge.findFirst({
        where: { userId, badgeId }
    });

    if (existing) {
        throw new ValidationError('Badge already assigned');
    }

    return await prisma.userBadge.create({
        data: { userId, badgeId }
    });
};

export const getMyRewardsService = async (userId) => {
    const reward = await prisma.userReward.findUnique({ where: { userId } });
    return reward || { userId, points: 0, totalSwaps: 0 };
};

// Reports
export const getMyReportsService = async (userId) => {
    return await prisma.report.findMany({
        where: { reporterId: userId },
        orderBy: { createdAt: 'desc' }
    });
};

export const getReportsService = async ({ page = 1, limit = 20, status } = {}) => {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [reports, total] = await Promise.all([
        prisma.report.findMany({
            where,
            include: {
                reporter: { select: { userId: true, username: true, email: true } },
                reportedUser: { select: { userId: true, username: true, email: true } }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        }),
        prisma.report.count({ where })
    ]);

    return {
        data: reports,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
};

export const updateReportStatusService = async (reportId, data) => {
    const { status } = data;
    if (!['OPEN', 'RESOLVED', 'REJECTED'].includes(status)) {
        throw new ValidationError('Invalid report status');
    }

    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFound('Report not found');

    return await prisma.report.update({
        where: { id: reportId },
        data: { status }
    });
};

// Penalties
export const createPenaltyService = async (data) => {
    const { userId, reason, penaltyType } = data;
    const user = await prisma.users.findUnique({ where: { userId } });
    if (!user) throw new NotFound('User not found');

    return await prisma.adminPenalty.create({
        data: { userId, reason, penaltyType }
    });
};

export const getMyPenaltiesService = async (userId) => {
    return await prisma.adminPenalty.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
    });
};

export const getPenaltiesService = async ({ page = 1, limit = 20 } = {}) => {
    const skip = (page - 1) * limit;
    const [penalties, total] = await Promise.all([
        prisma.adminPenalty.findMany({
            include: { user: { select: { userId: true, username: true, email: true } } },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        }),
        prisma.adminPenalty.count()
    ]);

    return {
        data: penalties,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
};

// Leaderboard
export const getLeaderboardService = async ({ page = 1, limit = 20 } = {}) => {
    const skip = (page - 1) * limit;
    const [leaders, total] = await Promise.all([
        prisma.userReward.findMany({
            orderBy: { points: 'desc' },
            skip,
            take: limit,
            include: {
                user: {
                    select: {
                        userId: true,
                        username: true,
                        profile: { select: { fullName: true, avatarUrl: true } }
                    }
                }
            }
        }),
        prisma.userReward.count()
    ]);

    return {
        data: leaders.map((entry, index) => ({
            rank: skip + index + 1,
            userId: entry.user.userId,
            username: entry.user.username,
            fullName: entry.user.profile?.fullName || null,
            avatarUrl: entry.user.profile?.avatarUrl || null,
            points: entry.points,
            totalSwaps: entry.totalSwaps,
        })),
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
};

// Skill categories
export const getSkillCategoriesService = async () => {
    const skills = await prisma.skill.findMany({
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' }
    });
    return skills.map(s => s.category);
};
