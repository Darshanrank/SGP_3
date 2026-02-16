import express from 'express';
import {conf} from './conf/conf.js';
// import cors from 'cors';
import {logger} from './utils/logger.js'
import bodyParser from 'body-parser';
import authRoute from './routes/auth.routes.js'
import cookieParser from 'cookie-parser';
const app = express();

// Middleware
// app.use(cors());
app.use(cookieParser())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) =>{
    res.send('Skill Swap Platform API is running');
} )

app.use('/api/auth',authRoute);

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

