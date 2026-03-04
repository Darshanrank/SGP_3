import bcrypt from 'bcrypt'
import prisma from '../prisma/client.js'
import { signAccessToken , signRefreshToken} from '../utils/jwt.js';
import { AuthError ,ForbiddenError} from '../errors/generic.errors.js'
import { persistRefreshToken, revokeAllUserRefreshTokens } from './refreshToken.service.js'
import crypto from 'crypto'

export const loginService = async ({email,password, isAutoLogin = false, userAgent, ip})=>{
    const user  = await prisma.users.findUnique({
        where:{email}
    })    
    if(!user){
        throw new AuthError('User not found','USER_NOT_FOUND');
    }

    // Check if user is banned or suspended
    const activePenalty = await prisma.adminPenalty.findFirst({
        where: {
            userId: user.userId,
            penaltyType: { in: ['BAN', 'SUSPEND'] }
        },
        orderBy: { createdAt: 'desc' }
    });
    if (activePenalty) {
        const label = activePenalty.penaltyType === 'BAN' ? 'banned' : 'suspended';
        throw new ForbiddenError(
            `Your account has been ${label}. Reason: ${activePenalty.reason}`,
            'ACCOUNT_PENALIZED'
        );
    }
    
    // Auto-login skips password check (assumes email link proved identity)
    if (!isAutoLogin) {
        if(!user.isVerified){
            throw new ForbiddenError('Email not verified','EMAIL_NOT_VERIFIED');
        }
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if(!isMatch){
            throw new AuthError('Invalid credentials','INVALID_CREDENTIALS');
        }
    }

    const userId =user.userId;
    const tokenId = crypto.randomUUID();
    const accessToken = await signAccessToken({ userId,email}); 
    const refreshToken = await signRefreshToken({ userId,email, tokenId});
    await persistRefreshToken({ userId, token: refreshToken, tokenId, userAgent, ip });
    
    return { accessToken, refreshToken };
}