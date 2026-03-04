import dotenv from 'dotenv';
dotenv.config();

const adminUserIds = (process.env.ADMIN_USER_IDS || '')
    .split(',')
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isInteger(value));

export const conf = {
    PORT:process.env.PORT || 5000,
    DATABASE_URL:process.env.DATABASE_URL,
    JWT_ACCESS_SECRET:process.env.JWT_ACCESS_SECRET,  
    JWT_REFRESH_SECRET:process.env.JWT_REFRESH_SECRET,
    JWT_URL_SECRET:process.env.JWT_URL_SECRET,
    JWT_ACCESS_EXPIRES:process.env.JWT_ACCESS_EXPIRES || '15m',
    JWT_REFRESH_EXPIRES:process.env.JWT_REFRESH_EXPIRES || '7d',
    EMAIL_USER:process.env.EMAIL_USER,
    EMAIL_PASS:process.env.EMAIL_PASS,
    FRONTEND_URL:process.env.FRONTEND_URL,
    BACKEND_URL:process.env.BACKEND_URL,
    ADMIN_USER_IDS: adminUserIds

}

if (!conf.JWT_ACCESS_SECRET) {
    throw new Error('JWT_ACCESS_SECRET is not defined in .env file');
}

if (!conf.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET is not defined in .env file');
}
