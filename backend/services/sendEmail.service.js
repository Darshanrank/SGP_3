import nodemailer from "nodemailer";
import {conf} from '../conf/conf.js';
import { EmailError } from "../errors/generic.errors.js";
import { logger } from '../utils/logger.js';

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: conf.EMAIL_USER,
        pass: conf.EMAIL_PASS
    }
});

export const sendEmailService = async (to, subject, text, html) =>{
    try{
        logger.info('Sending email', { to, subject });
                
        await transporter.sendMail({
            from: conf.EMAIL_USER,
            to, 
            subject,
            text,
            ...(html ? { html } : {})
        });
        return true;
    }catch(error){
        logger.error('Email sending failed', { to, subject, error: error.message });
        throw new EmailError('Error sending email', 'EMAIL_SENDING_FAILED');
    }
}
