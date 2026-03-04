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
import reviewRoute from './routes/review.routes.js'
import cookieParser from 'cookie-parser';
import path from 'path';
import { verifyAccessToken } from './utils/jwt.js';
import prisma from './prisma/client.js';
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

// Store io instance in app so controllers can access it
app.set('io', io);

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
            const allowed = await isUserInClass(userId, Number(classId));
            if (!allowed) {
                logger.warn('Unauthorized join_chat attempt', { socketId: socket.id, userId, classId });
                return socket.emit('error', 'Not authorized for this class');
            }
            const room = `chat_${classId}`;
            socket.join(room);
            logger.info(`Socket ${socket.id} joined room ${room}`);
        } catch (err) {
            logger.warn('join_chat failed', { socketId: socket.id, err: err.message });
            socket.emit('error', 'Unable to join room');
        }
    });

    socket.on('disconnect', () => {
        logger.info('User disconnected from socket', { socketId: socket.id });
    });

    // Typing indicators — relay to the chat room
    socket.on('typing_start', async (classId) => {
        try {
            const userId = socket.user?.userId;
            const allowed = await isUserInClass(userId, Number(classId));
            if (!allowed) return;
            socket.to(`chat_${classId}`).emit('user_typing', { userId, classId });
        } catch (_) {}
    });

    socket.on('typing_stop', async (classId) => {
        try {
            const userId = socket.user?.userId;
            const allowed = await isUserInClass(userId, Number(classId));
            if (!allowed) return;
            socket.to(`chat_${classId}`).emit('user_stop_typing', { userId, classId });
        } catch (_) {}
    });

    // Mark messages as read
    socket.on('mark_read', async (classId) => {
        try {
            const userId = socket.user?.userId;
            const allowed = await isUserInClass(userId, Number(classId));
            if (!allowed) return;

            const chatRoom = await prisma.chatRoom.findUnique({ where: { swapClassId: Number(classId) } });
            if (!chatRoom) return;

            await prisma.chatMessage.updateMany({
                where: {
                    chatRoomId: chatRoom.id,
                    senderId: { not: userId },
                    isRead: false,
                },
                data: { isRead: true },
            });

            // Notify sender that their messages were read
            socket.to(`chat_${classId}`).emit('messages_read', { classId, readByUserId: userId });
        } catch (err) {
            logger.warn('mark_read failed', { socketId: socket.id, err: err.message });
        }
    });
});

app.use(helmet());

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
app.use('/uploads', express.static(path.resolve('uploads')));

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
app.use('/api/reviews', reviewRoute);

app.use((err, req, res, next) => {
    logger[err.severity === "CRITICAL" ? "critical" : "warn"](err.message, {
        ip: req.ip,
        userAgent: req.headers["user-agent"]
    });
    res.status(err.statusCode || 500).json({
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


