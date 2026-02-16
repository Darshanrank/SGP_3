const writeLog = (level, message, context = {}) => {
    const log = {
        level,
        message,
        context,
        timeStamp: new Date().toISOString()
    }

    if (level = 'CRITICAL') {
        console.log(JSON.stringify(log));
    } else {
        setImmediate(() => console.log(JSON.stringify(log)))
    }
};

export const logger = {
    info: (msg, ctx) => writeLog("INFO", msg, ctx),
    warn: (msg, ctx) => writeLog("WARN", msg, ctx),
    error: (msg, ctx) => writeLog("ERROR", msg, ctx),
    critical: (msg, ctx) => writeLog("CRITICAL", msg, ctx)
};