import { registerService } from "../services/register.service.js";
import { verifyEmailService } from "../services/verify.service.js";
import { loginService } from '../services/login.service.js'
import { signUrlToken } from "../utils/jwt.js";
import {setPasswordService} from '../services/setpassword.service.js'
import prisma from "../prisma/client.js";
import { AuthError } from "../errors/generic.errors.js";

export const login = async (req, res) => {

    const { email, password } = req.body;
    const { accessToken, refreshToken } = await loginService({ email, password });
    
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000
    })
    res.status(200).json({ accessToken: accessToken });
};


export const register = async (req, res) => {

    const { username, email, password } = req.body;
    await registerService({ username, email, password });

    res.status(201).json({ message: 'User registered successfully' });

}


export const verify = async (req, res) => {
    const { token } = req.params;
    await verifyEmailService({ token });
    res.status(200).json({ message: 'Email verified successfully' });

}

export const resetPassword = async (req, res) => {
    const {email} = req.body;
    const user = await prisma.users.findUnique({
        where: { email }
    });
    if (!user) {
        throw new AuthError('User not found', 'USER_NOT_FOUND');
    }
    const token = signUrlToken({ email }, '10m');

    res.status(200).json({token});
}

export const setPassword = async (req, res) => {
    const {password} = req.body;
    const {token} = req.params;
    
    await setPasswordService({token,newPassword:password});

    res.status(200).json({message:'Password has been reset successfully'});
}