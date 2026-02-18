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