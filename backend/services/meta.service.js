import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getNotificationsService = async (userId) => {
    return await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
    });
};

export const markNotificationReadService = async (id) => {
    return await prisma.notification.update({
        where: { id },
        data: { isRead: true }
    });
};

export const getDashboardStatsService = async (userId) => {
    const reward = await prisma.userReward.findUnique({ where: { userId } });
    const badges = await prisma.userBadge.findMany({ 
        where: { userId },
        include: { badge: true }
    });

    return {
        points: reward?.points || 0,
        swaps: reward?.totalSwaps || 0,
        badges
    };
};

export const reportUserService = async (reporterId, data) => {
    const { reportedUserId, reason } = data;
    return await prisma.report.create({
        data: {
            reporterId,
            reportedUserId,
            reason
        }
    });
};

export const getCalendarEventsService = async (userId) => {
    return await prisma.calendarEvent.findMany({
        where: { userId },
        orderBy: { eventDate: 'asc' }
    });
};

export const createCalendarEventService = async (userId, data) => {
    const { title, eventDate, description, swapClassId } = data;
    
    return await prisma.calendarEvent.create({
        data: {
            userId,
            title,
            eventDate: new Date(eventDate),
            description,
            swapClassId
        }
    });
};
