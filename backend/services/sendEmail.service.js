import nodemailer from "nodemailer";
import {conf} from '../conf/conf.js';
import { EmailError } from "../errors/generic.errors.js";

const transponder  = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: conf.EMAIL_USER,
        pass: conf.EMAIL_PASS
    }
});

export const sendEmailService = async (to, subject, text) =>{
    try{
        console.log(to,subject,text);
                
        await transponder.sendMail({
            from: conf.EMAIL_USER,
            to, 
            subject,
            text
        });
        return true;
    }catch(error){
        console.log(error);
        throw new EmailError('Error sending email', 'EMAIL_SENDING_FAILED');
    }
}
