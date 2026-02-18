import { PrismaClient } from '@prisma/client';
import { ValidationError, ForbiddenError, NotFound } from '../errors/generic.errors.js';

const prisma = new PrismaClient();

export const getAllSkillsService = async () => {
    return await prisma.skill.findMany();
};

export const getUsersWithSkillService = async (skillId) => {
    const userSkills = await prisma.userSkill.findMany({
        where: { skillId: parseInt(skillId) },
        include: {
            user: {
                select: {
                    userId: true,
                    username: true,
                    profile: true
                }
            },
            preview: true
        }
    });
    return userSkills;
};

export const createSkillService = async (data) => {
    const { name, category } = data;
    const existing = await prisma.skill.findUnique({ where: { name } });
    if (existing) throw new ValidationError('Skill already exists');

    return await prisma.skill.create({
        data: { name, category }
    });
};

export const getUserSkillsService = async (userId) => {
    return await prisma.userSkill.findMany({
        where: { userId },
        include: { skill: true, preview: true }
    });
};

export const addUserSkillService = async (userId, data) => {
    const { skillId, type, level, proofUrl, preview } = data;

    const userSkill = await prisma.userSkill.create({
        data: {
            userId,
            skillId,
            type, // 'TEACH' or 'LEARN'
            level, // 'LOW', 'MEDIUM', 'HIGH'
            proofUrl
        }
    });

    // If it's a teaching skill, create a preview
    if (type === 'TEACH' && preview) {
        await prisma.skillPreview.create({
            data: {
                userSkillId: userSkill.id,
                videoUrl: preview.videoUrl,
                description: preview.description,
                syllabusOutline: preview.syllabusOutline
            }
        });
    }

    return userSkill;
};

export const removeUserSkillService = async (userId, skillId) => {
    // Verify ownership
    const userSkill = await prisma.userSkill.findFirst({
        where: { id: skillId, userId }
    });

    if (!userSkill) {
        throw new ForbiddenError('Not authorized or skill not found');
    }

    // Delete associated preview if exists
    await prisma.skillPreview.deleteMany({
        where: { userSkillId: skillId }
    });

    await prisma.userSkill.delete({
        where: { id: skillId }
    });

    return { message: 'Skill removed' };
};
