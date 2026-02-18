import { getMessagesService, sendMessageService } from '../services/chat.service.js';

// Get Messages for a Class
export const getMessages = async (req, res, next) => {
    try {
        const classId = parseInt(req.params.classId);
        const messages = await getMessagesService(classId);
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
        
        const newMessage = await sendMessageService(classId, userId, message);
        res.status(201).json(newMessage);
    } catch (error) {
        next(error);
    }
};
