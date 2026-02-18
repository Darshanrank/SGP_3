import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getMessagesService = async (classId) => {
    let chatRoom = await prisma.chatRoom.findUnique({
        where: { swapClassId: classId },
        include: {
            messages: {
                include: { sender: { select: { username: true, userId: true } } },
                orderBy: { createdAt: 'asc' }
            }
        }
    });

    if (!chatRoom) {
        chatRoom = await prisma.chatRoom.create({
            data: { swapClassId: classId }
        });
        return [];
    }

    return chatRoom.messages;
};

export const sendMessageService = async (classId, userId, message) => {
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
