import { ForbiddenError, NotFound, ValidationError } from '../errors/generic.errors.js';
import prisma from '../prisma/client.js';
import sanitizeHtml from 'sanitize-html';
import { assertUserInClass } from '../utils/assertUserInClass.js';

export const getMessagesService = async (userId, classId, { skip = 0, take = 20 }) => {
    await assertUserInClass(userId, classId);
    let chatRoom = await prisma.chatRoom.findUnique({
        where: { swapClassId: classId }
    });

    if (!chatRoom) {
        // Create room if it doesn't exist (legacy behavior)
        chatRoom = await prisma.chatRoom.create({
            data: { swapClassId: classId }
        });
        return { data: [], meta: { total: 0, page: 1, limit: take } };
    }

    const [messages, total] = await Promise.all([
        prisma.chatMessage.findMany({
            where: { chatRoomId: chatRoom.id },
            include: { sender: { select: { username: true, userId: true } } },
            orderBy: { createdAt: 'desc' }, // Latest first for pagination usually
            skip,
            take
        }),
        prisma.chatMessage.count({ where: { chatRoomId: chatRoom.id } })
    ]);


    return {
        data: messages.reverse(), // Client usually wants oldest first for chat flow
        meta: {
            total,
            page: Math.floor(skip / take) + 1,
            limit: take
        }
    };
};

export const sendMessageService = async (classId, userId, message) => {
    await assertUserInClass(userId, classId);
    if (!message || !message.trim()) {
        throw new ValidationError('Message is required');
    }
    // Sanitize message to prevent XSS — strip all HTML tags
    message = sanitizeHtml(message, { allowedTags: [], allowedAttributes: {} });
    let chatRoom = await prisma.chatRoom.findUnique({
        where: { swapClassId: classId }
    });

    if (!chatRoom) {
         chatRoom = await prisma.chatRoom.create({
            data: { swapClassId: classId }
        });
    }

    return await prisma.chatMessage.create({
        data: {
            chatRoomId: chatRoom.id,
            senderId: userId,
            message
        },
        include: { sender: { select: { username: true } } }
    });
};
