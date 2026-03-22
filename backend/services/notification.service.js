import prisma from '../prisma/client.js';
import { NotFound, ValidationError } from '../errors/generic.errors.js';
import { pushNotification } from '../utils/pushNotification.js';
import { sendWebPushToUserService } from './webPush.service.js';

const preferenceFieldByType = {
    SWAP_REQUEST: 'swapRequests',
    ACCEPTED: 'swapRequests',
    CLASS_REMINDER: 'classReminders',
    CHAT_MESSAGE: 'chatMessages',
    PARTNER_TYPING: 'partnerStatus',
    PARTNER_ONLINE: 'partnerStatus',
    SYSTEM: 'systemAlerts',
    ADMIN: 'systemAlerts'
};

const preferenceKeys = ['swapRequests', 'classReminders', 'chatMessages', 'partnerStatus', 'systemAlerts'];

const normalizeNotificationType = (value) => String(value || '').trim().toUpperCase();

export const getNotificationPreferenceService = async (userId) => {
    const existing = await prisma.notificationPreference.findUnique({
        where: { userId }
    });

    if (existing) return existing;

    return prisma.notificationPreference.create({
        data: { userId }
    });
};

export const updateNotificationPreferenceService = async (userId, payload = {}) => {
    const updateData = {};

    preferenceKeys.forEach((key) => {
        if (typeof payload[key] === 'boolean') {
            updateData[key] = payload[key];
        }
    });

    return prisma.notificationPreference.upsert({
        where: { userId },
        create: { userId, ...updateData },
        update: updateData
    });
};

export const isNotificationEnabledForUserService = async (userId, type) => {
    const normalizedType = normalizeNotificationType(type);
    const field = preferenceFieldByType[normalizedType];

    if (!field) {
        throw new ValidationError('Invalid notification type', 'INVALID_NOTIFICATION_TYPE');
    }

    const preference = await getNotificationPreferenceService(userId);
    return preference[field] !== false;
};

export const createNotificationForUserService = async ({
    userId,
    type,
    message,
    link,
    metadata,
    io,
    force = false,
    push = true
}) => {
    const normalizedType = normalizeNotificationType(type);
    if (!preferenceFieldByType[normalizedType]) {
        throw new ValidationError('Invalid notification type', 'INVALID_NOTIFICATION_TYPE');
    }

    if (!force) {
        const enabled = await isNotificationEnabledForUserService(userId, normalizedType);
        if (!enabled) {
            return null;
        }
    }

    const notification = await prisma.notification.create({
        data: {
            userId,
            type: normalizedType,
            message: String(message || '').trim(),
            link: link ? String(link).trim() : null,
            metadata: metadata ? JSON.stringify(metadata) : null
        }
    });

    if (io) {
        pushNotification(io, userId, notification);
    }

    if (push) {
        await sendWebPushToUserService(userId, {
            title: normalizedType.replace(/_/g, ' '),
            body: notification.message,
            data: {
                notificationId: notification.id,
                type: notification.type,
                link: notification.link
            }
        });
    }

    return notification;
};

export const deleteNotificationService = async (userId, notificationId) => {
    const notification = await prisma.notification.findFirst({
        where: { id: notificationId, userId }
    });

    if (!notification) {
        throw new NotFound('Notification not found');
    }

    await prisma.notification.delete({ where: { id: notificationId } });
    return { success: true };
};

export const deleteAllNotificationsService = async (userId) => {
    const result = await prisma.notification.deleteMany({ where: { userId } });
    return { deleted: result.count };
};
