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
});

app.use(helmet());

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply the rate limiting middleware to all requests
app.use(limiter);

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

app.use('/api/auth',authRoute);
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


