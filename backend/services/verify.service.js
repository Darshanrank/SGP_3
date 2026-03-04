import {sendEmailService} from '../services/sendEmail.service.js'
import {verifyUrlToken} from '../utils/jwt.js'
import prisma from '../prisma/client.js'
import { AuthError } from '../errors/generic.errors.js';
import {conf} from '../conf/conf.js'
import { verificationEmailHtml } from '../utils/emailTemplates.js';


// Ensure this points to the BACKEND URL for the API route, or strictly separate FRONTEND_URL and BACKEND_URL
// Assuming the user wants the link to hit the backend directly:
// const verificationLink = `${conf.BACKEND_URL}/api/auth/verify/${verificationCode}`;
// But current code uses FRONTEND_URL/api/auth... which is confusing if it hits backend. 
// I will assume the intention is for the link to hit the backend.
export const verifyEmailSend = async ({email, username, verificationCode}) =>{
    const subject = 'Verify your email address';
    const frontendUrl = conf.FRONTEND_URL || 'http://localhost:5173';
    const verificationLink = `${frontendUrl}/verify-email/${verificationCode}`;
    const text = `Please verify your email by clicking on the following link: ${verificationLink}`;
    const html = verificationEmailHtml(username || 'there', verificationLink);
    await sendEmailService(email, subject, text, html);
}


export const verifyEmailService = async ({token}) =>{        
        if(!token){
            throw new AuthError('Verification token is required','TOKEN_MISSING');
        }
        let data;
        try {
            data = verifyUrlToken(token);
        } catch (e) {
            throw new AuthError('Invalid or expired token','INVALID_TOKEN');
        }
        
        const user = await prisma.users.findUnique({
            where:{email:data.email}
        });
        
        // If user not found
        if(!user){
            throw new AuthError('User not found','USER_NOT_FOUND');
        }
        
        // Update user
        if(!user.isVerified){
            await prisma.users.update({
                where:{email:data.email},
                data:{isVerified:true}
            });
        }
        
        return user; // Return user so controller can login
}
