import { registerService } from "../services/register.service.js";
import { verifyEmailService } from "../services/verify.service.js";
import { loginService } from '../services/login.service.js'
import { signUrlToken } from "../utils/jwt.js";
import { setPasswordService } from '../services/setpassword.service.js'
import prisma from "../prisma/client.js";
import { AuthError, NotFound } from "../errors/generic.errors.js";

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const { accessToken, refreshToken } = await loginService({ email, password });
        
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        })
        res.status(200).json({ accessToken: accessToken });
    } catch (error) {
        next(error);
    }
};


export const register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        await registerService({ username, email, password });
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        next(error);
    }
}


export const verify = async (req, res, next) => {
    try {
        const { token } = req.params;
        await verifyEmailService({ token });
        res.status(200).json({ message: 'Email verified successfully' });
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
        res.status(200).json({ token });
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