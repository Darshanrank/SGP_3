import crypto from 'crypto';
import webpush from 'web-push';
import prisma from '../prisma/client.js';
import { ValidationError } from '../errors/generic.errors.js';
import { conf } from '../conf/conf.js';

const hasVapidConfig = Boolean(conf.VAPID_PUBLIC_KEY && conf.VAPID_PRIVATE_KEY && conf.VAPID_SUBJECT);

if (hasVapidConfig) {
    webpush.setVapidDetails(conf.VAPID_SUBJECT, conf.VAPID_PUBLIC_KEY, conf.VAPID_PRIVATE_KEY);
}

const parseSubscriptionPayload = (payload = {}) => {
    const endpoint = String(payload?.endpoint || '').trim();
    const p256dh = String(payload?.keys?.p256dh || '').trim();
    const auth = String(payload?.keys?.auth || '').trim();

    if (!endpoint || !p256dh || !auth) {
        throw new ValidationError('Invalid push subscription payload', 'INVALID_PUSH_SUBSCRIPTION');
    }

    return { endpoint, p256dh, auth };
};

const toStoredSubscription = (subscription) => ({
    endpoint: subscription.endpoint,
    keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
    }
});

export const getVapidPublicKeyService = () => ({
    publicKey: conf.VAPID_PUBLIC_KEY || null,
    configured: hasVapidConfig
});

export const savePushSubscriptionService = async (userId, payload) => {
    const subscription = parseSubscriptionPayload(payload);
    const endpointHash = crypto.createHash('sha256').update(subscription.endpoint).digest('hex');

    return prisma.pushSubscription.upsert({
        where: { endpointHash },
        create: {
            userId,
            endpoint: subscription.endpoint,
            endpointHash,
            p256dh: subscription.p256dh,
            auth: subscription.auth
        },
        update: {
            userId,
            endpoint: subscription.endpoint,
            p256dh: subscription.p256dh,
            auth: subscription.auth
        }
    });
};

export const removePushSubscriptionService = async (userId, endpoint) => {
    const normalizedEndpoint = String(endpoint || '').trim();

    if (!normalizedEndpoint) {
        const result = await prisma.pushSubscription.deleteMany({ where: { userId } });
        return { removed: result.count };
    }

    const endpointHash = crypto.createHash('sha256').update(normalizedEndpoint).digest('hex');
    const result = await prisma.pushSubscription.deleteMany({ where: { userId, endpointHash } });
    return { removed: result.count };
};

export const sendWebPushToUserService = async (userId, payload) => {
    if (!hasVapidConfig) {
        return { sent: 0, skipped: true };
    }

    const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
    if (!subscriptions.length) {
        return { sent: 0, skipped: false };
    }

    let sent = 0;

    await Promise.all(subscriptions.map(async (subscription) => {
        try {
            await webpush.sendNotification(
                toStoredSubscription(subscription),
                JSON.stringify(payload),
                { TTL: 60 }
            );
            sent += 1;
        } catch (error) {
            if (error?.statusCode === 404 || error?.statusCode === 410) {
                await prisma.pushSubscription.deleteMany({ where: { id: subscription.id } });
            }
        }
    }));

    return { sent, skipped: false };
};
