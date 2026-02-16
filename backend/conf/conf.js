import dotenv from 'dotenv';
dotenv.config();
export const conf = {
    PORT:process.env.PORT || 5000,
    DATABASE_URL:process.env.DATABASE_URL,
    JWT_ACCESS_SECRET:process.env.JWT_ACCESS_SECRET || 'your_jwt_access_secret',  
    JWT_REFRESH_SECRET:process.env.JWT_REFRESH_SECRET || 'your_jwt_refresh_secret',
    JWT_ACCESS_EXPIRES:process.env.JWT_ACCESS_EXPIRES || '15m',
    JWT_REFRESH_EXPIRES:process.env.JWT_REFRESH_EXPIRES || '7d',
    EMAIL_USER:process.env.EMAIL_USER,
    EMAIL_PASS:process.env.EMAIL_PASS,
    FRONTEND_URL:process.env.FRONTEND_URL 

}