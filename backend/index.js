import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { conf} from './conf/conf.js';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import {logger} from './utils/logger.js'
import authRoute from './routes/auth.routes.js'
import profileRoute from './routes/profile.routes.js'
import skillRoute from './routes/skill.routes.js'
import swapRoute from './routes/swap.routes.js'
import chatRoute from './routes/chat.routes.js'
import metaRoute from './routes/meta.routes.js'
import matchingRoute from './routes/matching.routes.js'
import discoverRoute from './routes/discover.routes.js'
import reviewRoute from './routes/review.routes.js'
import blockRoute from './routes/block.routes.js'
import reportRoute from './routes/report.routes.js'
import statsRoute from './routes/stats.routes.js'
import cookieParser from 'cookie-parser';
import path from 'path';
import { verifyAccessToken } from './utils/jwt.js';
import prisma from './prisma/client.js';
import { markMessagesDeliveredService, markMessagesReadService } from './services/chat.service.js';
import { areUsersBlocked } from './services/block.service.js';
import { startClassReminderScheduler } from './services/classReminder.service.js';
const app = express();
const server = createServer(app);
const frontendOrigin = conf.FRONTEND_URL || 'http://localhost:5173';
const io = new Server(server, {
    cors: {
        origin: frontendOrigin,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Socket auth middleware: require valid access token
io.use((socket, next) => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
        if (!token) {
            return next(new Error('AUTH_MISSING'));
        }
        const parsedToken = token.startsWith('Bearer ') ? token.slice(7) : token;
        const decoded = verifyAccessToken(parsedToken);
        socket.user = { userId: decoded.userId, email: decoded.email };
        return next();
    } catch (err) {
        return next(new Error('AUTH_INVALID'));
    }
});

// Helper: ensure user belongs to swap class
const isUserInClass = async (userId, classId) => {
    if (!classId || !Number.isInteger(Number(classId))) return false;
    const swapClass = await prisma.swapClass.findUnique({
        where: { id: Number(classId) },
        include: { swapRequest: { select: { fromUserId: true, toUserId: true } } }
    });
    if (!swapClass) return false;
    return swapClass.swapRequest.fromUserId === userId || swapClass.swapRequest.toUserId === userId;
};

const getPartnerIdInClass = async (userId, classId) => {
    const swapClass = await prisma.swapClass.findUnique({
        where: { id: Number(classId) },
        include: { swapRequest: { select: { fromUserId: true, toUserId: true } } }
    });
    if (!swapClass) return null;
    if (swapClass.swapRequest.fromUserId === userId) return swapClass.swapRequest.toUserId;
    if (swapClass.swapRequest.toUserId === userId) return swapClass.swapRequest.fromUserId;
    return null;
};

const getRoomUserIds = async (room, ioInstance) => {
    const sockets = await ioInstance.in(room).fetchSockets();
    return [...new Set(
        sockets
            .map((s) => s.user?.userId)
            .filter((id) => Number.isInteger(id))
    )];
};

const emitChatPresence = async (classId, ioInstance) => {
    const room = `chat_${classId}`;
    const userIds = await getRoomUserIds(room, ioInstance);
    ioInstance.to(room).emit('chat_presence', { classId: Number(classId), userIds });
};

const emitCallPresence = async (classId, ioInstance) => {
    const room = `call_${classId}`;
    const userIds = await getRoomUserIds(room, ioInstance);
    ioInstance.to(room).emit('classroom_call_presence', { classId: Number(classId), userIds });
};

// Store io instance in app so controllers can access it
app.set('io', io);
startClassReminderScheduler(io);

// Socket.io Connection Handler
io.on('connection', (socket) => {
    logger.info('User connected to socket', { socketId: socket.id, userId: socket.user?.userId });

    // Join personal notification room so server can push to this user
    const userRoom = `user_${socket.user?.userId}`;
    socket.join(userRoom);
    logger.info(`Socket ${socket.id} joined notification room ${userRoom}`);

    // Join a class/chat room
    socket.on('join_chat', async (classId) => {
        try {
            const userId = socket.user?.userId;
            const normalizedClassId = Number(classId);
            const allowed = await isUserInClass(userId, normalizedClassId);
            if (!allowed) {
                logger.warn('Unauthorized join_chat attempt', { socketId: socket.id, userId, classId });
                return socket.emit('error', 'Not authorized for this class');
            }

            const partnerId = await getPartnerIdInClass(userId, normalizedClassId);
            if (partnerId) {
                const blocked = await areUsersBlocked(userId, partnerId);
                if (blocked) {
                    return socket.emit('error', 'Chat unavailable because one user is blocked');
                }
            }

            const room = `chat_${classId}`;
            socket.join(room);
            logger.info(`Socket ${socket.id} joined room ${room}`);

            socket.to(room).emit('user_online', {
                classId: normalizedClassId,
                userId
            });

            const delivered = await markMessagesDeliveredService(userId, normalizedClassId);
            if (delivered.count > 0) {
                io.to(room).emit('messages_delivered', {
                    classId: normalizedClassId,
                    deliveredToUserId: userId,
                    deliveredAt: delivered.deliveredAt
                });
            }

            await emitChatPresence(normalizedClassId, io);
        } catch (err) {
            logger.warn('join_chat failed', { socketId: socket.id, err: err.message });
            socket.emit('error', 'Unable to join room');
        }
    });

    socket.on('classroom_call_join', async (classId) => {
        try {
            const userId = socket.user?.userId;
            const normalizedClassId = Number(classId);
            const allowed = await isUserInClass(userId, normalizedClassId);
            if (!allowed) {
                return socket.emit('error', 'Not authorized for this class');
            }

            const partnerId = await getPartnerIdInClass(userId, normalizedClassId);
            if (partnerId) {
                const blocked = await areUsersBlocked(userId, partnerId);
                if (blocked) {
                    return socket.emit('error', 'Call unavailable because one user is blocked');
                }
            }

            const room = `call_${normalizedClassId}`;
            socket.join(room);
            await emitCallPresence(normalizedClassId, io);
        } catch (err) {
            logger.warn('classroom_call_join failed', { socketId: socket.id, err: err.message });
            socket.emit('error', 'Unable to join call room');
        }
    });

    socket.on('classroom_call_leave', async (classId) => {
        try {
            const normalizedClassId = Number(classId);
            if (!Number.isInteger(normalizedClassId)) return;
            socket.leave(`call_${normalizedClassId}`);
            await emitCallPresence(normalizedClassId, io);
        } catch (err) {
            logger.warn('classroom_call_leave failed', { socketId: socket.id, err: err.message });
        }
    });

    socket.on('classroom_call_offer', async ({ classId, toUserId, sdp }) => {
        try {
            const fromUserId = socket.user?.userId;
            const normalizedClassId = Number(classId);
            const normalizedToUserId = Number(toUserId);
            if (!Number.isInteger(normalizedClassId) || !Number.isInteger(normalizedToUserId) || !sdp) return;

            const allowed = await isUserInClass(fromUserId, normalizedClassId);
            if (!allowed) return;

            io.to(`call_${normalizedClassId}`).emit('classroom_call_offer', {
                classId: normalizedClassId,
                fromUserId,
                toUserId: normalizedToUserId,
                sdp
            });
        } catch (err) {
            logger.warn('classroom_call_offer relay failed', { socketId: socket.id, err: err.message });
        }
    });

    socket.on('classroom_call_answer', async ({ classId, toUserId, sdp }) => {
        try {
            const fromUserId = socket.user?.userId;
            const normalizedClassId = Number(classId);
            const normalizedToUserId = Number(toUserId);
            if (!Number.isInteger(normalizedClassId) || !Number.isInteger(normalizedToUserId) || !sdp) return;

            const allowed = await isUserInClass(fromUserId, normalizedClassId);
            if (!allowed) return;

            io.to(`call_${normalizedClassId}`).emit('classroom_call_answer', {
                classId: normalizedClassId,
                fromUserId,
                toUserId: normalizedToUserId,
                sdp
            });
        } catch (err) {
            logger.warn('classroom_call_answer relay failed', { socketId: socket.id, err: err.message });
        }
    });

    socket.on('classroom_call_ice_candidate', async ({ classId, toUserId, candidate }) => {
        try {
            const fromUserId = socket.user?.userId;
            const normalizedClassId = Number(classId);
            const normalizedToUserId = Number(toUserId);
            if (!Number.isInteger(normalizedClassId) || !Number.isInteger(normalizedToUserId) || !candidate) return;

            const allowed = await isUserInClass(fromUserId, normalizedClassId);
            if (!allowed) return;

            io.to(`call_${normalizedClassId}`).emit('classroom_call_ice_candidate', {
                classId: normalizedClassId,
                fromUserId,
                toUserId: normalizedToUserId,
                candidate
            });
        } catch (err) {
            logger.warn('classroom_call_ice_candidate relay failed', { socketId: socket.id, err: err.message });
        }
    });

    socket.on('disconnecting', async () => {
        logger.info('User disconnected from socket', { socketId: socket.id });
        const joinedClassRooms = Array.from(socket.rooms).filter((room) => room.startsWith('chat_'));
        for (const room of joinedClassRooms) {
            const classId = room.replace('chat_', '');
            await emitChatPresence(classId, io);
        }

        const joinedCallRooms = Array.from(socket.rooms).filter((room) => room.startsWith('call_'));
        for (const room of joinedCallRooms) {
            const classId = room.replace('call_', '');
            await emitCallPresence(classId, io);
        }
    });

    // Typing indicators — relay to the chat room
    const relayTypingStart = async (classId) => {
        try {
            const userId = socket.user?.userId;
            const allowed = await isUserInClass(userId, Number(classId));
            if (!allowed) return;
            const partnerId = await getPartnerIdInClass(userId, Number(classId));
            if (partnerId && await areUsersBlocked(userId, partnerId)) return;
            socket.to(`chat_${classId}`).emit('user_typing', { userId, classId });
            socket.to(`chat_${classId}`).emit('typing', { userId, classId });
        } catch (_) {}
    };

    const relayTypingStop = async (classId) => {
        try {
            const userId = socket.user?.userId;
            const allowed = await isUserInClass(userId, Number(classId));
            if (!allowed) return;
            const partnerId = await getPartnerIdInClass(userId, Number(classId));
            if (partnerId && await areUsersBlocked(userId, partnerId)) return;
            socket.to(`chat_${classId}`).emit('user_stop_typing', { userId, classId });
            socket.to(`chat_${classId}`).emit('stopTyping', { userId, classId });
        } catch (_) {}
    };

    socket.on('typing_start', relayTypingStart);
    socket.on('typing', relayTypingStart);
    socket.on('typing_stop', relayTypingStop);
    socket.on('stopTyping', relayTypingStop);

    // Message reactions relay
    socket.on('message_reaction', async ({ classId, messageId, emoji, previousEmoji }) => {
        try {
            const userId = socket.user?.userId;
            const normalizedClassId = Number(classId);
            const normalizedMessageId = Number(messageId);
            if (!Number.isInteger(normalizedClassId) || !Number.isInteger(normalizedMessageId)) return;

            const allowed = await isUserInClass(userId, normalizedClassId);
            if (!allowed) return;
            const partnerId = await getPartnerIdInClass(userId, normalizedClassId);
            if (partnerId && await areUsersBlocked(userId, partnerId)) return;

            const nextEmoji = typeof emoji === 'string' ? emoji : null;
            const prevEmoji = typeof previousEmoji === 'string' ? previousEmoji : null;
            if (!nextEmoji && !prevEmoji) return;

            socket.to(`chat_${normalizedClassId}`).emit('message_reaction', {
                classId: normalizedClassId,
                messageId: normalizedMessageId,
                emoji: nextEmoji,
                previousEmoji: prevEmoji,
                userId
            });
        } catch (err) {
            logger.warn('message_reaction relay failed', { socketId: socket.id, err: err.message });
        }
    });

    // Shared whiteboard scene relay
    socket.on('whiteboard_scene_update', async ({ classId, scene }) => {
        try {
            const userId = socket.user?.userId;
            const normalizedClassId = Number(classId);
            if (!Number.isInteger(normalizedClassId) || !scene) return;

            const allowed = await isUserInClass(userId, normalizedClassId);
            if (!allowed) return;
            const partnerId = await getPartnerIdInClass(userId, normalizedClassId);
            if (partnerId && await areUsersBlocked(userId, partnerId)) return;

            socket.to(`chat_${normalizedClassId}`).emit('whiteboard_scene_updated', {
                classId: normalizedClassId,
                scene,
                updatedBy: userId
            });
        } catch (err) {
            logger.warn('whiteboard_scene_update relay failed', { socketId: socket.id, err: err.message });
        }
    });

    // Mark messages as read
    socket.on('mark_read', async (classId) => {
        try {
            const userId = socket.user?.userId;
            const normalizedClassId = Number(classId);
            const allowed = await isUserInClass(userId, normalizedClassId);
            if (!allowed) return;
            const partnerId = await getPartnerIdInClass(userId, normalizedClassId);
            if (partnerId && await areUsersBlocked(userId, partnerId)) return;

            const result = await markMessagesReadService(userId, normalizedClassId);
            if (result.count === 0) return;

            // Notify sender that their messages were read
            socket.to(`chat_${classId}`).emit('messages_read', {
                classId: normalizedClassId,
                readByUserId: userId,
                readAt: result.readAt
            });
        } catch (err) {
            logger.warn('mark_read failed', { socketId: socket.id, err: err.message });
        }
    });

    // Shared notes realtime collaboration relay
    socket.on('shared_note_edit', async ({ classId, content }) => {
        try {
            const userId = socket.user?.userId;
            const normalizedClassId = Number(classId);
            const allowed = await isUserInClass(userId, normalizedClassId);
            if (!allowed) return;

            socket.to(`chat_${normalizedClassId}`).emit('shared_note_updated', {
                classId: normalizedClassId,
                content: typeof content === 'string' ? content : '',
                updatedAt: new Date().toISOString(),
                updatedBy: userId
            });
        } catch (err) {
            logger.warn('shared_note_edit failed', { socketId: socket.id, err: err.message });
        }
    });
});

// Serve uploaded files BEFORE Helmet so Cross-Origin-Resource-Policy doesn't block them
app.use('/uploads', express.static(path.resolve('uploads')));

app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// General rate limiter — generous for regular API usage
const generalLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 500,               // 500 requests per 15 min (covers chat, polling, etc.)
	standardHeaders: true,
	legacyHeaders: false,
});

// Strict limiter for auth-sensitive endpoints (login, register, password reset)
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 20,                // 20 attempts per 15 min
	standardHeaders: true,
	legacyHeaders: false,
	message: { code: 'RATE_LIMITED', message: 'Too many attempts, please try again later.' }
});

// Apply the general rate limiter to all requests
app.use(generalLimiter);

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const level = res.statusCode >= 400 ? 'warn' : 'info';
        logger[level](`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration,
            ip: req.ip
        });
    });
    next();
});

// Middleware
app.use(cors({
    origin: frontendOrigin,
    credentials: true
}));
app.use(cookieParser())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) =>{
    res.send('Skill Swap Platform API is running');
} )

// Apply strict rate limiting to auth routes
app.use('/api/auth', authLimiter, authRoute);
app.use('/api/profile', profileRoute);
app.use('/api/skills', skillRoute);
app.use('/api/swaps', swapRoute);
app.use('/api/chat', chatRoute);
app.use('/api/meta', metaRoute);
app.use('/api/matching', matchingRoute);
app.use('/api/discover', discoverRoute);
app.use('/api/reviews', reviewRoute);
app.use('/api/blocks', blockRoute);
app.use('/api/reports', reportRoute);
app.use('/api/stats', statsRoute);

app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const logLevel = err.severity === "CRITICAL" ? "critical" : statusCode >= 500 ? "error" : "warn";
    logger[logLevel](err.message, {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        statusCode,
        code: err.code
    });
    res.status(statusCode).json({
        code: err.code || "INTERNAL_ERROR",
        message: err.message || "Something went wrong"
    });
});

server.listen(conf.PORT, () => {
    logger.info(`Server is running on port ${conf.PORT}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${conf.PORT} is already in use. Kill the other process or use a different port.`);
    } else {
        logger.error('Server error:', err);
    }
    process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received — shutting down gracefully...`);
    
    // 1. Stop accepting new connections
    server.close(() => {
        logger.info('HTTP server closed');
    });

    // 2. Close Socket.io connections
    io.close(() => {
        logger.info('Socket.io closed');
    });

    // 3. Disconnect Prisma
    try {
        await prisma.$disconnect();
        logger.info('Prisma disconnected');
    } catch (err) {
        logger.warn('Error disconnecting Prisma', { error: err.message });
    }

    process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));


