import express from 'express';
import {conf} from './conf/conf.js';
import cors from 'cors';
import {logger} from './utils/logger.js'
import authRoute from './routes/auth.routes.js'
import profileRoute from './routes/profile.routes.js'
import skillRoute from './routes/skill.routes.js'
import swapRoute from './routes/swap.routes.js'
import chatRoute from './routes/chat.routes.js'
import metaRoute from './routes/meta.routes.js'
import cookieParser from 'cookie-parser';
const app = express();

// Middleware
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(cookieParser())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) =>{
    res.send('Skill Swap Platform API is running');
} )

app.use('/api/auth',authRoute);
app.use('/api/profile', profileRoute);
app.use('/api/skills', skillRoute);
app.use('/api/swaps', swapRoute);
app.use('/api/chat', chatRoute);
app.use('/api/meta', metaRoute);

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

app.listen(conf.PORT, () => {
    console.log(`Server is running on port ${conf.PORT}`);
}
);

