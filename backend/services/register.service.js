import bcrypt from 'bcrypt'
import prisma from '../prisma/client.js'
import { signUrlToken } from '../utils/jwt.js';
import { AuthError } from '../errors/generic.errors.js'
import { verifyEmailSend } from '../services/verify.service.js';

export const registerService = async ({ username, email, password }) => {
    if(!username){
        throw new AuthError('Username is required','USERNAME_MISSING');
    }
    const user = await prisma.users.findUnique({
        where: { email }
    });

    if (user) {
        throw new AuthError('User already exists', 'USER_EXISTS');
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const verificationCode = signUrlToken({ email }, '10m');
    try {
        await prisma.users.create({
            data: {
                username,
                email,
                passwordHash: hashedPassword,
                salt,
                isVerified: false
            }
        });
    } catch (error) {
        console.log(error);


        throw new AuthError(
            'Error creating user',
            'USER_CREATION_FAILED'
        );

    }
    verifyEmailSend({ email, verificationCode }).catch(err => console.error('Email error:', err));
}
