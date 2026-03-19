import {
    getMessagesService,
    sendMessageService,
    searchMessagesService,
    markMessagesDeliveredService
} from '../services/chat.service.js';
import { ValidationError } from '../errors/generic.errors.js';
import prisma from '../prisma/client.js';
import { conf } from '../conf/conf.js';

const normalizeClassId = (value) => {
    const classId = Number.parseInt(value, 10);
    if (!Number.isInteger(classId)) {
        throw new ValidationError('Invalid class id', 'INVALID_CLASS_ID');
    }
    return classId;
};

const getUploadedFileUrl = (file) => {
    if (!file) return null;
    if (file.location) return file.location;
    const relativePath = String(file.path || '').replace(/\\/g, '/');
    if (!relativePath) return null;
    return `${conf.BACKEND_URL || `http://localhost:${conf.PORT}`}/${relativePath}`;
};

const getRecipientIdsInRoom = async (io, classId, senderId) => {
    if (!io) return [];
    const room = `chat_${classId}`;
    const sockets = await io.in(room).fetchSockets();
    const ids = sockets
        .map((s) => s.user?.userId)
        .filter((userId) => Number.isInteger(userId) && userId !== senderId);
    return [...new Set(ids)];
};

const emitChatMessageAndStatus = async ({ io, classId, senderId, newMessage }) => {
    if (!io) return newMessage;

    io.to(`chat_${classId}`).emit('receive_message', newMessage);

    const recipientIds = await getRecipientIdsInRoom(io, classId, senderId);
    if (!recipientIds.length) return newMessage;

    for (const recipientId of recipientIds) {
        const delivered = await markMessagesDeliveredService(recipientId, classId);
        if (delivered.count > 0) {
            io.to(`chat_${classId}`).emit('messages_delivered', {
                classId,
                deliveredToUserId: recipientId,
                deliveredAt: delivered.deliveredAt
            });
        }
    }

    const refreshed = await prisma.chatMessage.findUnique({
        where: { id: newMessage.id },
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

    return refreshed || newMessage;
};

// Get Messages for a Class
export const getMessages = async (req, res, next) => {
    try {
        const classId = normalizeClassId(req.params.classId);
        const userId = req.user.userId;
        const limit = Number.parseInt(req.query.limit, 10) || 20;
        const cursor = req.query.cursor || null;

        const messages = await getMessagesService(userId, classId, { cursor, limit });
        res.json(messages);
    } catch (error) {
        next(error);
    }
};

export const searchMessages = async (req, res, next) => {
    try {
        const classId = normalizeClassId(req.params.classId);
        const userId = req.user.userId;
        const query = String(req.query.q || '').trim();
        const limit = Number.parseInt(req.query.limit, 10) || 50;

        const result = await searchMessagesService(userId, classId, { query, limit });
        res.json(result);
    } catch (error) {
        next(error);
    }
};

// Send Message
export const sendMessage = async (req, res, next) => {
    try {
        const classId = normalizeClassId(req.params.classId);
        const userId = req.user.userId;
        const { message } = req.body;

        const newMessage = await sendMessageService(classId, userId, { message });
        
        // Emit Socket.io event for real-time chat update
        const io = req.app.get('io');
        const messageWithStatus = await emitChatMessageAndStatus({ io, classId, senderId: userId, newMessage });

        // Push a notification to the other participant
        const swapClass = await prisma.swapClass.findUnique({
            where: { id: classId },
            include: { swapRequest: { select: { fromUserId: true, toUserId: true } } }
        });
        if (swapClass) {
            const otherUserId = swapClass.swapRequest.fromUserId === userId
                ? swapClass.swapRequest.toUserId
                : swapClass.swapRequest.fromUserId;
            // Lightweight push — no DB notification for every chat msg, just socket event
            if (io) {
                io.to(`user_${otherUserId}`).emit('new_chat_message', {
                    classId,
                    senderId: userId,
                    senderName: messageWithStatus.sender?.username,
                    preview: message.substring(0, 80)
                });
            }
        }

        res.status(201).json(messageWithStatus);
    } catch (error) {
        next(error);
    }
};

export const sendAttachmentMessage = async (req, res, next) => {
    try {
        const classId = normalizeClassId(req.params.classId);
        const userId = req.user.userId;
        const caption = typeof req.body?.message === 'string' ? req.body.message : '';

        if (!req.file) {
            throw new ValidationError('Attachment file is required');
        }

        const attachment = {
            url: getUploadedFileUrl(req.file),
            name: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size
        };

        if (!attachment.url) {
            throw new ValidationError('Could not resolve attachment URL');
        }

        const newMessage = await sendMessageService(classId, userId, {
            message: caption,
            attachment
        });

        const io = req.app.get('io');
        const messageWithStatus = await emitChatMessageAndStatus({ io, classId, senderId: userId, newMessage });

        const swapClass = await prisma.swapClass.findUnique({
            where: { id: classId },
            include: { swapRequest: { select: { fromUserId: true, toUserId: true } } }
        });

        if (swapClass && io) {
            const otherUserId = swapClass.swapRequest.fromUserId === userId
                ? swapClass.swapRequest.toUserId
                : swapClass.swapRequest.fromUserId;

            io.to(`user_${otherUserId}`).emit('new_chat_message', {
                classId,
                senderId: userId,
                senderName: messageWithStatus.sender?.username,
                preview: `[Attachment] ${attachment.name}`
            });
        }

        res.status(201).json(messageWithStatus);
    } catch (error) {
        next(error);
    }
};
