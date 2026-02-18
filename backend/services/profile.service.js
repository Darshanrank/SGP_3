import { PrismaClient } from '@prisma/client';
import { NotFound } from '../errors/generic.errors.js';

const prisma = new PrismaClient();

export const getMyProfileService = async (userId) => {
    const user = await prisma.users.findUnique({
        where: { userId },
        include: {
            profile: true,
            userSkills: {
                include: { skill: true }
            },
            badges: {
                include: { badge: true }
            }
        }
    });

    if (!user) {
        throw new NotFound('User not found');
    }

    const { passwordHash, salt, ...userInfo } = user;
    return userInfo;
};

export const updateProfileService = async (userId, data) => {
    const { bio, avatarUrl, learningLanguage } = data;

    return await prisma.userProfile.upsert({
        where: { userId },
        update: {
            bio,
            avatarUrl,
            learningLanguage
        },
        create: {
            userId,
            bio,
            avatarUrl,
            learningLanguage
        }
    });
};

export const getPublicProfileService = async (userId) => {
    const user = await prisma.users.findUnique({
        where: { userId },
        select: {
            userId: true,
            username: true,
            createdAt: true,
            profile: {
                select: {
                    bio: true,
                    avatarUrl: true,
                    learningLanguage: true
                }
            },
            userSkills: {
                where: { type: 'TEACH' },
                include: { skill: true }
            },
            badges: {
                include: { badge: true }
            }
        }
    });

    if (!user) {
        throw new NotFound('User not found');
    }
    return user;
};
