import prisma from '../prisma/client.js';
import { ValidationError, ForbiddenError, NotFound } from '../errors/generic.errors.js';

export const getAllSkillsService = async ({ skip = 0, take = 20, search = '', category = '' }) => {
    const where = {};
    if (search) where.name = { contains: search };
    if (category) where.category = category;

    const [skills, total] = await Promise.all([
        prisma.skill.findMany({
            where,
            skip,
            take,
            orderBy: { name: 'asc' }
        }),
        prisma.skill.count({ where })
    ]);

    return {
        data: skills,
        meta: {
            total,
            page: Math.floor(skip / take) + 1,
            limit: take,
            totalPages: Math.ceil(total / take)
        }
    };
};

export const getUsersWithSkillService = async (skillId, { skip = 0, take = 20, type, level } = {}) => {
    const where = { 
        skillId: parseInt(skillId),
        ...(type && { type }),
        ...(level && { level })
    };
    
    const [userSkills, total] = await Promise.all([
        prisma.userSkill.findMany({
            where,
            include: {
                user: {
                    select: {
                        userId: true,
                        username: true,
                        profile: true
                    }
                },
                preview: true
            },
            skip,
            take
        }),
        prisma.userSkill.count({ where })
    ]);

    return {
        data: userSkills,
        meta: {
            total,
            page: Math.floor(skip / take) + 1,
            limit: take
        }
    };
};

export const createSkillService = async (data) => {
    const { name, category } = data;
    if (!name || !category) throw new ValidationError('Skill name and category are required');

    const normalizedName = name.trim();
    const normalizedCategory = category.trim();

    if (!normalizedName || !normalizedCategory) {
        throw new ValidationError('Skill name and category are required');
    }

    const existing = await prisma.skill.findUnique({ where: { name: normalizedName } });
    if (existing) throw new ValidationError('Skill already exists');

    return await prisma.skill.create({
        data: { name: normalizedName, category: normalizedCategory }
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

    const skill = await prisma.skill.findUnique({ where: { id: skillId } });
    if (!skill) throw new NotFound('Skill not found');

    const existing = await prisma.userSkill.findFirst({
        where: {
            userId,
            skillId,
            type
        }
    });

    // Use a transaction to ensure UserSkill and SkillPreview are saved atomically
    const userSkill = await prisma.$transaction(async (tx) => {
        let record;

        if (existing) {
            record = await tx.userSkill.update({
                where: { id: existing.id },
                data: {
                    level,
                    proofUrl
                }
            });
        } else {
            record = await tx.userSkill.create({
                data: {
                    userId,
                    skillId,
                    type,
                    level,
                    proofUrl
                }
            });
        }

        if (type === 'TEACH' && preview) {
            await tx.skillPreview.upsert({
                where: { userSkillId: record.id },
                create: {
                    userSkillId: record.id,
                    videoUrl: preview.videoUrl,
                    description: preview.description,
                    syllabusOutline: preview.syllabusOutline
                },
                update: {
                    videoUrl: preview.videoUrl,
                    description: preview.description,
                    syllabusOutline: preview.syllabusOutline
                }
            });
        }

        return record;
    });

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

    const swapUsage = await prisma.swapRequest.count({
        where: {
            OR: [
                { teachSkillId: skillId },
                { learnSkillId: skillId }
            ]
        }
    });

    if (swapUsage > 0) {
        throw new ValidationError('Skill is used in swap requests and cannot be removed');
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
