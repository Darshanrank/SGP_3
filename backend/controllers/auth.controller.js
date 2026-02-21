import { registerService } from "../services/register.service.js";
import { verifyEmailService } from "../services/verify.service.js";
import { loginService } from '../services/login.service.js'
import { signUrlToken } from "../utils/jwt.js";
import { setPasswordService } from '../services/setpassword.service.js'
import prisma from "../prisma/client.js";
import { AuthError, NotFound } from "../errors/generic.errors.js";
import { sendEmailService } from "../services/sendEmail.service.js";
import { conf } from "../conf/conf.js";
import { rotateRefreshToken, revokeRefreshToken } from '../services/refreshToken.service.js'

export const login = async (req, res, next) => {
    try {
        const { email, password, rememberMe = false } = req.body;
        const { accessToken, refreshToken } = await loginService({ 
            email, 
            password, 
            userAgent: req.headers['user-agent'], 
            ip: req.ip
        });
        const refreshMaxAge = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
        
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            sameSite: 'strict',
            maxAge: refreshMaxAge
        })
        res.status(200).json({ accessToken: accessToken });
    } catch (error) {
        next(error);
    }
};

export const refresh = async (req, res, next) => {
    try {
        const token = req.cookies?.refreshToken || req.body?.refreshToken;
        if (!token) {
            throw new AuthError('Refresh token missing', 'REFRESH_MISSING');
        }
        const { accessToken, refreshToken } = await rotateRefreshToken({
            refreshToken: token,
            userAgent: req.headers['user-agent'],
            ip: req.ip
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.status(200).json({ accessToken });
    } catch (error) {
        next(error);
    }
};


export const register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        await registerService({ username, email, password });
        res.status(201).json({ message: 'User registered successfully. Please check your email to verify your account.' });
    } catch (error) {
        next(error);
    }
}


export const verify = async (req, res, next) => {
    try {
        const { token } = req.params;
        const user = await verifyEmailService({ token });
        
        const { accessToken, refreshToken } = await loginService({ 
            email: user.email, 
            isAutoLogin: true,
            userAgent: req.headers['user-agent'],
            ip: req.ip
        }); 

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 Days
        });

        res.status(200).json({
            message: 'Email verified successfully',
            accessToken,
            user: {
                userId: user.userId,
                email: user.email,
                username: user.username,
                isVerified: user.isVerified
            }
        });
        
    } catch (error) {
        next(error);
    }
}

export const resetPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await prisma.users.findUnique({
            where: { email }
        });
        if (!user) {
            throw new NotFound('User not found'); // Using NotFound instead of AuthError for clarity
        }
        const token = signUrlToken({ email }, '10m');
        const frontendUrl = conf.FRONTEND_URL || 'http://localhost:5173';
        const resetLink = `${frontendUrl}/reset-password/${token}`;

        await sendEmailService(
            email,
            'Reset your Skill Swap password',
            `Click this link to reset your password: ${resetLink}. This link expires in 10 minutes.`
        );

        res.status(200).json({ message: 'Password reset link sent to your email' });
    } catch (error) {
        next(error);
    }
}

export const setPassword = async (req, res, next) => {
    try {
        const { password } = req.body;
        const { token } = req.params;
        
        await setPasswordService({ token, newPassword: password });

        res.status(200).json({ message: 'Password has been reset successfully' });
    } catch (error) {
        next(error);
    }
}

export const logout = async (req, res, next) => {
    try {
        const token = req.cookies?.refreshToken || req.body?.refreshToken;
        if (token) {
            await revokeRefreshToken({ refreshToken: token });
        }
        res.clearCookie('refreshToken', {
            httpOnly: true,
            sameSite: 'strict'
        });
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
}