import bcrypt from 'bcrypt'
import prisma from '../prisma/client.js'
import { signUrlToken } from '../utils/jwt.js';
import { AuthError } from '../errors/generic.errors.js'
import { verifyEmailSend } from '../services/verify.service.js';
import { logger } from '../utils/logger.js';

const USERNAME_MIN = 3;
const USERNAME_MAX = 30;
const USERNAME_REGEX = /^[a-z0-9_]+$/;

export const registerService = async ({ username, email, password }) => {
    const normalizedUsername = String(username || '').trim().toLowerCase();

    if(!normalizedUsername){
        throw new AuthError('Username is required','USERNAME_MISSING');
    }

    if (normalizedUsername.length < USERNAME_MIN || normalizedUsername.length > USERNAME_MAX) {
        throw new AuthError(`Username must be ${USERNAME_MIN}-${USERNAME_MAX} characters`, 'USERNAME_INVALID_LENGTH');
    }

    if (!USERNAME_REGEX.test(normalizedUsername)) {
        throw new AuthError('Username must contain only lowercase letters, numbers, and underscore (_)', 'USERNAME_INVALID_FORMAT');
    }

    // Check username uniqueness
    const existingUsername = await prisma.users.findFirst({
        where: { username: normalizedUsername }
    });
    if (existingUsername) {
        throw new AuthError('Username is already taken', 'USERNAME_TAKEN');
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
                username: normalizedUsername,
                email,
                passwordHash: hashedPassword,
                salt,
                isVerified: false
            }
        });
    } catch (error) {
        logger.error('User creation failed', { email, error: error.message });

        throw new AuthError(
            'Error creating user',
            'USER_CREATION_FAILED'
        );

    }
    verifyEmailSend({ email, username: normalizedUsername, verificationCode }).catch(err => console.error('Email error:', err));
}
