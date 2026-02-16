import {sendEmailService} from '../services/sendEmail.service.js'
import {verifyUrlToken} from '../utils/jwt.js'
import prisma from '../prisma/client.js'
import { AuthError } from '../errors/generic.errors.js';
import {conf} from '../conf/conf.js'


export const verifyEmailSend = async ({email,verificationCode}) =>{
    const subject = 'Verify your email address';
    const text = `Please verify your email by clicking on the following link: ${conf.FRONTEND_URL}/api/auth/verify/${verificationCode}`;
    await sendEmailService(email, subject, text);
}


export const verifyEmailService = async ({token}) =>{        
        if(!token){
            throw new AuthError('Verification token is required','TOKEN_MISSING');
        }
        const data = verifyUrlToken(token);
        if(!data){
            throw new AuthError('Invalid token','INVALID_TOKEN');
        }
        
        const user = await prisma.users.findUnique({
            where:{email:data.email}
        });
        
        if(!user){
            throw new AuthError('User not found','USER_NOT_FOUND');
        }
        if(user.isVerified){
            throw new AuthError('Email already verified','EMAIL_ALREADY_VERIFIED');
        }
        
        await prisma.users.update({
            where:{email:data.email},
            data:{isVerified:true}
        });

    
}