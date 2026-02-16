import prisma from "../prisma/client.js";
import bcrypt from "bcrypt";
import { verifyUrlToken } from '../utils/jwt.js';
import { AuthError } from "../errors/generic.errors.js";

export const setPasswordService = async ({ token, newPassword }) => {
    const data = verifyUrlToken(token);
    if (!data) {
        throw new AuthError('Invalid or expired token', 'INVALID_TOKEN');
    }
    const user = await prisma.users.findUnique({
        where: { email: data.email }
    });
    if (!user) {
        throw new AuthError('User not found', 'USER_NOT_FOUND');
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await prisma.users.update({
        where: { email: data.email },
        data: {
            passwordHash: hashedPassword,
            salt: salt
        }
    });
}