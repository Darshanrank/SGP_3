import bcrypt from 'bcrypt'
import prisma from '../prisma/client.js'
import { signAccessToken , signRefreshToken} from '../utils/jwt.js';
import { AuthError ,ForbiddenError} from '../errors/generic.errors.js'

export const loginService = async ({email,password})=>{
    const user  = await prisma.users.findUnique({
        where:{email}
    })    
    if(!user){
        throw new AuthError('User not found','USER_NOT_FOUND');
    }
    if(!user.isVerified){
        throw new ForbiddenError('Email not verified','EMAIL_NOT_VERIFIED');
    }
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if(!isMatch){
        throw new AuthError('Invalid credentials','INVALID_CREDENTIALS');
    }
    const userId =user.userId;
    const accessToken = await signAccessToken({ userId,email}); 
    const refreshToken = await signRefreshToken({ userId,email});
    return { accessToken, refreshToken };
}