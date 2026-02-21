import winston from 'winston';

const { combine, timestamp, printf, colorize, json } = winston.format;

const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
});

const isProduction = process.env.NODE_ENV === 'production';

export const logger = winston.createLogger({
    level: isProduction ? 'info' : 'debug',
    format: combine(
        timestamp(),
        isProduction ? json() : combine(colorize(), logFormat)
    ),
    transports: [
        new winston.transports.Console(),
        // Add file transports here for production if needed
        // new winston.transports.File({ filename: 'error.log', level: 'error' }),
    ],
});

// Add custom 'critical' method alias for backward compatibility if needed, 
// though winston levels are error, warn, info, http, verbose, debug, silly.
// We'll map critical to error for now, or add a custom level.
logger.critical = (msg, meta) => logger.log('error', `[CRITICAL] ${msg}`, meta);
