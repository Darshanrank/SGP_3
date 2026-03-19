import { verifyAccessToken } from '../utils/jwt.js';

export const validateTokenMiddleware = (req, res, next) => {
    let token = req.headers['authorization'];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    if (token.startsWith('Bearer ')) {
        token = token.slice(7, token.length);
    }

    try {
        const decoded = verifyAccessToken(token);
        // Assuming payload has userId. Adjust if it uses 'id' or other field.
        req.user = decoded; 
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}; 

export const optionalTokenMiddleware = (req, _res, next) => {
    let token = req.headers['authorization'];
    if (!token) {
        return next();
    }

    if (token.startsWith('Bearer ')) {
        token = token.slice(7, token.length);
    }

    try {
        const decoded = verifyAccessToken(token);
        req.user = decoded;
    } catch (_err) {
        // Ignore invalid optional tokens for public endpoints.
    }

    return next();
};