import { getMessagesService, sendMessageService } from '../services/chat.service.js';
import { ValidationError } from '../errors/generic.errors.js';
import { pushNotification } from '../utils/pushNotification.js';
import prisma from '../prisma/client.js';

// Get Messages for a Class
export const getMessages = async (req, res, next) => {
    try {
        const classId = parseInt(req.params.classId);
        const userId = req.user.userId;
        if (!Number.isInteger(classId)) {
            throw new ValidationError('Invalid class id', 'INVALID_CLASS_ID');
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const skip = (page - 1) * limit;

        const messages = await getMessagesService(userId, classId, { skip, take: limit });
        res.json(messages);
    } catch (error) {
        next(error);
    }
};

// Send Message
export const sendMessage = async (req, res, next) => {
    try {
        const classId = parseInt(req.params.classId);
        const userId = req.user.userId;
        const { message } = req.body;

        if (!Number.isInteger(classId)) {
            throw new ValidationError('Invalid class id', 'INVALID_CLASS_ID');
        }
        
        const newMessage = await sendMessageService(classId, userId, message);
        
        // Emit Socket.io event for real-time chat update
        const io = req.app.get('io');
        if (io) {
            io.to(`chat_${classId}`).emit('receive_message', newMessage);
        }

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
                    senderName: newMessage.sender?.username,
                    preview: message.substring(0, 80)
                });
            }
        }

        res.status(201).json(newMessage);
    } catch (error) {
        next(error);
    }
};
