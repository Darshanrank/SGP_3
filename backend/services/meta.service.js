import prisma from '../prisma/client.js';
import { NotFound, ValidationError } from '../errors/generic.errors.js';
import { conf } from '../conf/conf.js';
import {
    createNotificationForUserService,
    getNotificationPreferenceService,
    updateNotificationPreferenceService,
    deleteNotificationService,
    deleteAllNotificationsService
} from './notification.service.js';
import {
    savePushSubscriptionService,
    removePushSubscriptionService,
    getVapidPublicKeyService
} from './webPush.service.js';

const ALLOWED_REPORT_REASONS = new Set([
    'SPAM',
    'HARASSMENT',
    'SCAM_OR_FRAUD',
    'INAPPROPRIATE_CONTENT',
    'IMPERSONATION',
    'OTHER'
]);
const MAX_REPORTS_PER_DAY = 5;

const normalizeReportReason = (reason) => String(reason || '').trim().toUpperCase();

const isUnknownCalendarTypeArgError = (error) => {
    const message = String(error?.message || '');
    return message.includes('Unknown argument `type`');
};

const MAX_CALENDAR_DESCRIPTION_LENGTH = 191;

const parseCalendarDescription = (description) => {
    if (typeof description !== 'string' || !description.trim()) {
        return { descriptionText: '', startTime: null, endTime: null, location: '', reminderMinutes: 10, status: 'scheduled', type: 'personal' };
    }

    try {
        const parsed = JSON.parse(description);
        if (parsed && typeof parsed === 'object' && parsed.m === 1) {
            return {
                descriptionText: String(parsed.d || '').trim(),
                startTime: Number.isFinite(Number(parsed.s)) ? new Date(Number(parsed.s)) : null,
                endTime: Number.isFinite(Number(parsed.e)) ? new Date(Number(parsed.e)) : null,
                location: String(parsed.l || '').trim(),
                reminderMinutes: Number.isInteger(Number(parsed.r)) ? Number(parsed.r) : 10,
                type: ['teaching', 'learning', 'swap', 'personal'].includes(String(parsed.t || ''))
                    ? String(parsed.t)
                    : 'personal',
                status: ['scheduled', 'completed', 'cancelled'].includes(String(parsed.st || ''))
                    ? String(parsed.st)
                    : 'scheduled'
            };
        }

        if (parsed && typeof parsed === 'object' && parsed.__calendarMeta === true) {
            return {
                descriptionText: String(parsed.descriptionText || '').trim(),
                startTime: parsed.startTime ? new Date(parsed.startTime) : null,
                endTime: parsed.endTime ? new Date(parsed.endTime) : null,
                location: String(parsed.location || '').trim(),
                reminderMinutes: Number.isInteger(Number(parsed.reminderMinutes)) ? Number(parsed.reminderMinutes) : 10,
                type: ['teaching', 'learning', 'swap', 'personal'].includes(String(parsed.type || ''))
                    ? String(parsed.type)
                    : 'personal',
                status: ['scheduled', 'completed', 'cancelled'].includes(String(parsed.status || ''))
                    ? String(parsed.status)
                    : 'scheduled'
            };
        }
    } catch (_) {
        // Fallback to plain text description
    }

    return { descriptionText: description.trim(), startTime: null, endTime: null, location: '', reminderMinutes: 10, status: 'scheduled', type: 'personal' };
};

const serializeCalendarDescription = ({ descriptionText = '', startTime = null, endTime = null, location = '', reminderMinutes = 10, status = 'scheduled', type = 'personal' } = {}) => {
    const normalized = {
        m: 1,
        d: String(descriptionText || '').trim(),
        s: startTime ? new Date(startTime).getTime() : null,
        e: endTime ? new Date(endTime).getTime() : null,
        l: String(location || '').trim(),
        r: Number(reminderMinutes) || 10,
        t: ['teaching', 'learning', 'swap', 'personal'].includes(String(type || '')) ? String(type) : 'personal',
        st: ['scheduled', 'completed', 'cancelled'].includes(String(status || '')) ? String(status) : 'scheduled'
    };

    let serialized = JSON.stringify(normalized);
    if (serialized.length <= MAX_CALENDAR_DESCRIPTION_LENGTH) return serialized;

    // Keep essential scheduling metadata first; shorten optional text fields.
    if (normalized.d.length > 48) {
        normalized.d = normalized.d.slice(0, 48);
        serialized = JSON.stringify(normalized);
    }
    if (serialized.length <= MAX_CALENDAR_DESCRIPTION_LENGTH) return serialized;

    if (normalized.l.length > 32) {
        normalized.l = normalized.l.slice(0, 32);
        serialized = JSON.stringify(normalized);
    }
    if (serialized.length <= MAX_CALENDAR_DESCRIPTION_LENGTH) return serialized;

    normalized.d = '';
    serialized = JSON.stringify(normalized);
    if (serialized.length <= MAX_CALENDAR_DESCRIPTION_LENGTH) return serialized;

    normalized.l = '';
    serialized = JSON.stringify(normalized);
    if (serialized.length <= MAX_CALENDAR_DESCRIPTION_LENGTH) return serialized;

    const minimal = {
        m: 1,
        s: normalized.s,
        e: normalized.e,
        r: normalized.r,
        t: normalized.t,
        st: normalized.st
    };
    return JSON.stringify(minimal);
};

const mapCalendarEventForClient = (event) => {
    const meta = parseCalendarDescription(event.description);
    const resolvedEnd = meta.endTime;
    const now = new Date();
    let status = meta.status || 'scheduled';
    if (status !== 'cancelled' && resolvedEnd && now > resolvedEnd) {
        status = 'completed';
    }

    return {
        ...event,
        eventDate: meta.startTime || event.eventDate,
        startTime: meta.startTime || event.eventDate,
        endTime: resolvedEnd,
        type: event.type || meta.type || 'personal',
        location: meta.location,
        description: meta.descriptionText,
        reminderMinutes: meta.reminderMinutes,
        status
    };
};

export const getNotificationsService = async (userId, { page = 1, limit = 20, isRead, type } = {}) => {
    const skip = (page - 1) * limit;
    const normalizedType = String(type || '').trim().toUpperCase();
    const notificationTypeFilter = normalizedType ? { type: normalizedType } : {};
    const where = {
        userId,
        ...notificationTypeFilter,
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

export const markNotificationUnreadService = async (userId, id) => {
    const notification = await prisma.notification.findFirst({
        where: { id, userId }
    });

    if (!notification) {
        throw new NotFound('Notification not found');
    }

    return await prisma.notification.update({
        where: { id },
        data: { isRead: false }
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

export const getNotificationPreferencesService = async (userId) => {
    return getNotificationPreferenceService(userId);
};

export const updateNotificationPreferencesService = async (userId, payload) => {
    return updateNotificationPreferenceService(userId, payload);
};

export const savePushSubscriptionMetaService = async (userId, payload) => {
    return savePushSubscriptionService(userId, payload);
};

export const removePushSubscriptionMetaService = async (userId, endpoint) => {
    return removePushSubscriptionService(userId, endpoint);
};

export const getPushPublicKeyMetaService = async () => {
    return getVapidPublicKeyService();
};

export const deleteNotificationMetaService = async (userId, id) => {
    return deleteNotificationService(userId, id);
};

export const clearNotificationHistoryMetaService = async (userId) => {
    return deleteAllNotificationsService(userId);
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

export const reportUserService = async (reporterId, data, { io } = {}) => {
    const reportedUserId = Number(data?.reportedUserId);
    const normalizedReason = normalizeReportReason(data?.reason);
    const description = typeof data?.description === 'string' ? data.description.trim() : '';

    if (reporterId === reportedUserId) {
        throw new ValidationError('You cannot report yourself');
    }

    if (!ALLOWED_REPORT_REASONS.has(normalizedReason)) {
        throw new ValidationError('Invalid report reason', 'INVALID_REPORT_REASON');
    }

    const reportedUser = await prisma.users.findUnique({
        where: { userId: reportedUserId }
    });

    if (!reportedUser) {
        throw new NotFound('Reported user not found');
    }

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const [alreadyOpenReport, reportsToday] = await Promise.all([
        prisma.report.findFirst({
            where: {
                reporterId,
                reportedUserId,
                status: 'OPEN'
            }
        }),
        prisma.report.count({
            where: {
                reporterId,
                createdAt: { gte: dayStart }
            }
        })
    ]);

    if (alreadyOpenReport) {
        throw new ValidationError('You already have an open report for this user', 'DUPLICATE_REPORT');
    }

    if (reportsToday >= MAX_REPORTS_PER_DAY) {
        throw new ValidationError('Daily report limit reached', 'REPORT_LIMIT_REACHED');
    }

    const reportReason = description
        ? `${normalizedReason}: ${description}`
        : normalizedReason;

    const report = await prisma.report.create({
        data: {
            reporterId,
            reportedUserId,
            reason: reportReason
        }
    });

    if (Array.isArray(conf.ADMIN_USER_IDS) && conf.ADMIN_USER_IDS.length > 0) {
        const adminIds = conf.ADMIN_USER_IDS
            .filter((adminUserId) => Number.isInteger(adminUserId) && adminUserId !== reporterId);
        for (const adminUserId of adminIds) {
            await createNotificationForUserService({
                userId: adminUserId,
                type: 'ADMIN',
                message: `New user report submitted (#${report.id}) against @${reportedUser.username}`,
                link: '/admin/reports',
                metadata: { reportId: report.id, reportedUserId },
                io
            });
        }
    }

    return report;
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
        data: events.map(mapCalendarEventForClient),
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
};

export const createCalendarEventService = async (userId, data) => {
    const { title, eventDate, startTime, endTime, description, location, reminderMinutes, status, swapClassId, type } = data;
    const startAt = startTime || eventDate;

    if (!startAt) {
        throw new ValidationError('Event start time is required');
    }

    if (endTime && new Date(endTime).getTime() <= new Date(startAt).getTime()) {
        throw new ValidationError('End time must be after start time');
    }

    if (swapClassId) {
        const swapClass = await prisma.swapClass.findUnique({
            where: { id: swapClassId },
            include: { swapRequest: { select: { fromUserId: true, toUserId: true } } }
        });
        if (!swapClass) throw new NotFound('Swap class not found');
        const isMember = swapClass.swapRequest.fromUserId === userId || swapClass.swapRequest.toUserId === userId;
        if (!isMember) throw new ValidationError('Swap class does not belong to user');
    }

    const calendarPayload = {
        userId,
        title,
        eventDate: startAt,
        type: type || 'personal',
        description: serializeCalendarDescription({
            descriptionText: description,
            startTime: startAt,
            endTime,
            location,
            reminderMinutes,
            status,
            type: type || 'personal'
        }),
        swapClassId
    };

    let created;
    try {
        created = await prisma.calendarEvent.create({ data: calendarPayload });
    } catch (error) {
        if (!isUnknownCalendarTypeArgError(error)) throw error;

        // Backward compatibility: database/client may not yet include CalendarEvent.type
        const { type: _ignoredType, ...legacyPayload } = calendarPayload;
        created = await prisma.calendarEvent.create({ data: legacyPayload });
    }

    return mapCalendarEventForClient(created);
};

export const updateCalendarEventService = async (userId, eventId, data) => {
    const event = await prisma.calendarEvent.findFirst({ where: { id: eventId, userId } });
    if (!event) {
        throw new NotFound('Calendar event not found');
    }

    const currentMeta = parseCalendarDescription(event.description);
    const nextTitle = typeof data.title === 'string' ? data.title : event.title;
    const nextStart = data.startTime || data.eventDate || currentMeta.startTime || event.eventDate;
    const nextEnd = data.endTime !== undefined ? data.endTime : currentMeta.endTime;
    const nextLocation = data.location !== undefined ? data.location : currentMeta.location;
    const nextDescription = data.description !== undefined ? data.description : currentMeta.descriptionText;
    const nextReminderMinutes = data.reminderMinutes !== undefined ? data.reminderMinutes : currentMeta.reminderMinutes;
    const nextStatus = data.status !== undefined ? data.status : currentMeta.status;
    const nextType = data.type !== undefined ? data.type : (event.type || currentMeta.type || 'personal');

    if (!nextStart) {
        throw new ValidationError('Event start time is required');
    }
    if (nextEnd && new Date(nextEnd).getTime() <= new Date(nextStart).getTime()) {
        throw new ValidationError('End time must be after start time');
    }

    const updatePayload = {
        title: nextTitle,
        eventDate: nextStart,
        type: nextType,
        description: serializeCalendarDescription({
            descriptionText: nextDescription,
            startTime: nextStart,
            endTime: nextEnd,
            location: nextLocation,
            reminderMinutes: nextReminderMinutes,
            status: nextStatus,
            type: nextType
        })
    };

    let updated;
    try {
        updated = await prisma.calendarEvent.update({
            where: { id: eventId },
            data: updatePayload
        });
    } catch (error) {
        if (!isUnknownCalendarTypeArgError(error)) throw error;

        // Backward compatibility: database/client may not yet include CalendarEvent.type
        const { type: _ignoredType, ...legacyPayload } = updatePayload;
        updated = await prisma.calendarEvent.update({
            where: { id: eventId },
            data: legacyPayload
        });
    }

    return mapCalendarEventForClient(updated);
};

export const deleteCalendarEventService = async (userId, eventId) => {
    const event = await prisma.calendarEvent.findFirst({ where: { id: eventId, userId } });
    if (!event) {
        throw new NotFound('Calendar event not found');
    }

    await prisma.calendarEvent.delete({ where: { id: eventId } });
    return { success: true };
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

export const getRewardsHistoryService = async (userId, { limit = 20 } = {}) => {
    const safeLimit = Math.max(1, Math.min(50, Number(limit) || 20));

    const [reward, completedSwaps, positiveReviews, taughtSkills, allUserSkills] = await Promise.all([
        prisma.userReward.findUnique({ where: { userId } }),
        prisma.swapClass.findMany({
            where: {
                status: 'COMPLETED',
                swapRequest: {
                    OR: [{ fromUserId: userId }, { toUserId: userId }]
                }
            },
            select: { id: true, endedAt: true, startedAt: true }
        }),
        prisma.swapReview.findMany({
            where: {
                revieweeId: userId,
                overallRating: { gte: 4 }
            },
            select: { id: true, createdAt: true }
        }),
        prisma.userSkill.findMany({
            where: { userId, type: 'TEACH' },
            select: { skillId: true }
        }),
        prisma.userSkill.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
            select: { id: true, createdAt: true }
        })
    ]);

    const events = [];

    completedSwaps.forEach((swap) => {
        events.push({
            id: `swap-${swap.id}`,
            action: 'Completed Swap',
            points: 20,
            createdAt: swap.endedAt || swap.startedAt || new Date().toISOString()
        });
    });

    positiveReviews.forEach((review) => {
        events.push({
            id: `review-${review.id}`,
            action: 'Received Positive Review',
            points: 10,
            createdAt: review.createdAt
        });
    });

    if (allUserSkills.length > 0) {
        events.push({
            id: `skill-first-${allUserSkills[0].id}`,
            action: 'First Skill Added',
            points: 15,
            createdAt: allUserSkills[0].createdAt
        });
    }

    const history = events
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, safeLimit);

    return {
        data: history,
        metrics: {
            points: reward?.points || 0,
            totalSwaps: reward?.totalSwaps || completedSwaps.length,
            positiveReviews: positiveReviews.length,
            taughtSkills: new Set(taughtSkills.map((item) => item.skillId)).size
        }
    };
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

export const moderateReportService = async (reportId, data = {}, { io } = {}) => {
    const action = String(data?.action || '').trim().toUpperCase();
    const adminReason = typeof data?.reason === 'string' ? data.reason.trim() : '';

    if (!['WARNING', 'SUSPEND', 'BAN', 'REJECT'].includes(action)) {
        throw new ValidationError('Invalid moderation action', 'INVALID_MODERATION_ACTION');
    }

    const report = await prisma.report.findUnique({
        where: { id: reportId },
        include: {
            reportedUser: { select: { userId: true, username: true } }
        }
    });
    if (!report) throw new NotFound('Report not found');

    if (action === 'REJECT') {
        return prisma.report.update({
            where: { id: reportId },
            data: { status: 'REJECTED' }
        });
    }

    const penaltyType = action;
    const reason = adminReason || `Moderation action from report #${reportId}`;

    const updatedReport = await prisma.$transaction(async (tx) => {
        await tx.adminPenalty.create({
            data: {
                userId: report.reportedUserId,
                reason,
                penaltyType
            }
        });

        return tx.report.update({
            where: { id: reportId },
            data: { status: 'RESOLVED' }
        });
    });

    await createNotificationForUserService({
        userId: report.reportedUserId,
        type: 'SYSTEM',
        message: `You received a ${penaltyType.toLowerCase()} from moderation. Reason: ${reason}`,
        link: '/notifications',
        metadata: { reportId, action: penaltyType },
        io
    });

    return updatedReport;
};

// Penalties
export const createPenaltyService = async (data, { io } = {}) => {
    const { userId, reason, penaltyType } = data;
    const user = await prisma.users.findUnique({ where: { userId } });
    if (!user) throw new NotFound('User not found');

    const penalty = await prisma.adminPenalty.create({
        data: { userId, reason, penaltyType }
    });

    await createNotificationForUserService({
        userId,
        type: 'SYSTEM',
        message: `Admin action: ${penaltyType.toLowerCase()}. Reason: ${reason}`,
        link: '/notifications',
        metadata: { penaltyId: penalty.id, penaltyType },
        io
    });

    return penalty;
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

// Availability Slots
export const getUserAvailabilityService = async (userId) => {
    return await prisma.userAvailability.findMany({
        where: { userId },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    });
};

export const createAvailabilitySlotService = async (userId, data) => {
    const { dayOfWeek, startTime, endTime, timezone } = data;

    // Validate time format (HH:MM)
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
        throw new ValidationError('Time must be in HH:MM format');
    }

    // Validate end time is after start time
    if (startTime >= endTime) {
        throw new ValidationError('End time must be after start time');
    }

    // Check for overlapping slots on same day
    const existing = await prisma.userAvailability.findMany({
        where: { userId, dayOfWeek }
    });

    const hasOverlap = existing.some(slot => {
        return (startTime < slot.endTime && endTime > slot.startTime);
    });

    if (hasOverlap) {
        throw new ValidationError('This time slot overlaps with an existing availability');
    }

    return await prisma.userAvailability.create({
        data: {
            userId,
            dayOfWeek,
            startTime,
            endTime,
            timezone: timezone || 'UTC'
        }
    });
};

export const updateAvailabilitySlotService = async (userId, slotId, data) => {
    const { dayOfWeek, startTime, endTime, timezone } = data;

    const slot = await prisma.userAvailability.findFirst({
        where: { id: slotId, userId }
    });

    if (!slot) {
        throw new NotFound('Availability slot not found');
    }

    // Validate time format (HH:MM)
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
        throw new ValidationError('Time must be in HH:MM format');
    }

    // Validate end time is after start time
    if (startTime >= endTime) {
        throw new ValidationError('End time must be after start time');
    }

    // Check overlaps on same day excluding current slot
    const existing = await prisma.userAvailability.findMany({
        where: {
            userId,
            dayOfWeek,
            id: { not: slotId }
        }
    });

    const hasOverlap = existing.some((row) => startTime < row.endTime && endTime > row.startTime);
    if (hasOverlap) {
        throw new ValidationError('This time slot overlaps with an existing availability');
    }

    return await prisma.userAvailability.update({
        where: { id: slotId },
        data: {
            dayOfWeek,
            startTime,
            endTime,
            timezone: timezone || 'UTC'
        }
    });
};

export const deleteAvailabilitySlotService = async (userId, slotId) => {
    const slot = await prisma.userAvailability.findFirst({
        where: { id: slotId, userId }
    });

    if (!slot) {
        throw new NotFound('Availability slot not found');
    }

    await prisma.userAvailability.delete({
        where: { id: slotId }
    });

    return { success: true };
};
