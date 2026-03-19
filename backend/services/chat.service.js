import { ValidationError } from '../errors/generic.errors.js';
import prisma from '../prisma/client.js';
import sanitizeHtml from 'sanitize-html';
import { assertUserInClass } from '../utils/assertUserInClass.js';
import { assertUsersNotBlocked } from './block.service.js';

const parseCursorDate = (cursor) => {
    if (!cursor) return null;
    const value = new Date(cursor);
    if (Number.isNaN(value.getTime())) {
        throw new ValidationError('Invalid cursor value');
    }
    return value;
};

const resolveMessageType = (attachmentMime) => {
    if (!attachmentMime) return 'TEXT';
    if (attachmentMime.startsWith('image/')) return 'IMAGE';
    return 'FILE';
};

const ensureChatRoom = async (classId) => {
    const existing = await prisma.chatRoom.findUnique({
        where: { swapClassId: classId }
    });

    if (existing) return existing;

    return prisma.chatRoom.create({
        data: { swapClassId: classId }
    });
};

export const getMessagesService = async (userId, classId, { cursor, limit = 20 } = {}) => {
    await assertUserInClass(userId, classId);
    const chatRoom = await ensureChatRoom(classId);
    const take = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const cursorDate = parseCursorDate(cursor);

    const where = {
        chatRoomId: chatRoom.id,
        ...(cursorDate ? { createdAt: { lt: cursorDate } } : {})
    };

    const [rawRows, total] = await Promise.all([
        prisma.chatMessage.findMany({
            where,
            include: {
                sender: {
                    select: {
                        username: true,
                        userId: true,
                        profile: { select: { avatarUrl: true } }
                    }
                }
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: take + 1
        }),
        prisma.chatMessage.count({ where: { chatRoomId: chatRoom.id } })
    ]);

    const hasMore = rawRows.length > take;
    const rows = hasMore ? rawRows.slice(0, take) : rawRows;
    const nextCursor = hasMore ? rows[rows.length - 1]?.createdAt?.toISOString?.() : null;

    return {
        data: rows.reverse(),
        meta: {
            total,
            limit: take,
            hasMore,
            nextCursor
        }
    };
};

export const searchMessagesService = async (userId, classId, { query, limit = 50 } = {}) => {
    await assertUserInClass(userId, classId);

    const term = String(query || '').trim();
    if (!term) {
        return { data: [], meta: { total: 0, query: term } };
    }

    const chatRoom = await prisma.chatRoom.findUnique({ where: { swapClassId: classId } });
    if (!chatRoom) {
        return { data: [], meta: { total: 0, query: term } };
    }

    const take = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const rows = await prisma.chatMessage.findMany({
        where: {
            chatRoomId: chatRoom.id,
            message: { contains: term }
        },
        include: {
            sender: {
                select: {
                    username: true,
                    userId: true,
                    profile: { select: { avatarUrl: true } }
                }
            }
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take
    });

    return {
        data: rows,
        meta: {
            total: rows.length,
            query: term,
            limit: take
        }
    };
};

export const sendMessageService = async (classId, userId, data) => {
    const swapClass = await assertUserInClass(userId, classId);
    const partnerId = swapClass.swapRequest.fromUserId === userId
        ? swapClass.swapRequest.toUserId
        : swapClass.swapRequest.fromUserId;
    await assertUsersNotBlocked(userId, partnerId);

    const rawMessage = typeof data?.message === 'string' ? data.message : '';
    const cleanedMessage = sanitizeHtml(rawMessage, { allowedTags: [], allowedAttributes: {} }).trim();

    const attachment = data?.attachment || null;
    if (!cleanedMessage && !attachment?.url) {
        throw new ValidationError('Message is required');
    }

    const chatRoom = await ensureChatRoom(classId);
    const messageType = attachment?.url ? resolveMessageType(attachment.mimeType || '') : 'TEXT';

    return await prisma.chatMessage.create({
        data: {
            chatRoomId: chatRoom.id,
            senderId: userId,
            message: cleanedMessage || (attachment?.name ? `[Attachment] ${attachment.name}` : '[Attachment]'),
            messageType,
            attachmentUrl: attachment?.url || null,
            attachmentName: attachment?.name || null,
            attachmentMime: attachment?.mimeType || null,
            attachmentSize: attachment?.size || null
        },
        include: {
            sender: {
                select: {
                    username: true,
                    userId: true,
                    profile: { select: { avatarUrl: true } }
                }
            }
        }
    });
};

export const markMessagesDeliveredService = async (userId, classId) => {
    await assertUserInClass(userId, classId);
    const chatRoom = await prisma.chatRoom.findUnique({ where: { swapClassId: classId } });
    if (!chatRoom) return { count: 0, deliveredAt: null };

    const deliveredAt = new Date();
    const result = await prisma.chatMessage.updateMany({
        where: {
            chatRoomId: chatRoom.id,
            senderId: { not: userId },
            deliveredAt: null
        },
        data: {
            deliveredAt
        }
    });

    return { count: result.count, deliveredAt };
};

export const markMessagesReadService = async (userId, classId) => {
    await assertUserInClass(userId, classId);
    const chatRoom = await prisma.chatRoom.findUnique({ where: { swapClassId: classId } });
    if (!chatRoom) return { count: 0, readAt: null };

    const now = new Date();
    const result = await prisma.chatMessage.updateMany({
        where: {
            chatRoomId: chatRoom.id,
            senderId: { not: userId },
            isRead: false
        },
        data: {
            isRead: true,
            readAt: now,
            deliveredAt: now
        }
    });

    return { count: result.count, readAt: now };
};
