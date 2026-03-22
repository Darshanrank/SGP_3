import prisma from '../prisma/client.js';
import { ValidationError, ForbiddenError, NotFound } from '../errors/generic.errors.js';

const isMissingDisplayOrderColumnError = (error) => {
    const code = String(error?.code || '');
    const column = String(error?.meta?.column || '');
    const message = String(error?.message || '').toLowerCase();
    const mentionsDisplayOrder = column.toLowerCase().includes('displayorder') || message.includes('displayorder');
    return (code === 'P2022' && mentionsDisplayOrder) || mentionsDisplayOrder;
};

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
    try {
        return await prisma.userSkill.findMany({
            where: { userId },
            orderBy: [
                { displayOrder: 'asc' },
                { createdAt: 'asc' }
            ],
            include: { skill: true, preview: true }
        });
    } catch (error) {
        if (!isMissingDisplayOrderColumnError(error)) {
            throw error;
        }

        // Fallback for environments where the latest migration is not applied yet.
        return prisma.userSkill.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
            include: { skill: true, preview: true }
        });
    }
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
        let supportsDisplayOrder = true;
        let nextOrder = 0;

        try {
            const maxOrderRow = await tx.userSkill.aggregate({
                where: { userId },
                _max: { displayOrder: true }
            });
            nextOrder = (maxOrderRow._max.displayOrder ?? -1) + 1;
        } catch (error) {
            if (!isMissingDisplayOrderColumnError(error)) {
                throw error;
            }
            supportsDisplayOrder = false;
        }

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
                    ...(supportsDisplayOrder ? { displayOrder: nextOrder } : {}),
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

export const updateUserSkillService = async (userId, userSkillId, data) => {
    const { type, level, category } = data;

    const userSkill = await prisma.userSkill.findFirst({
        where: { id: userSkillId, userId },
        include: { skill: true }
    });

    if (!userSkill) {
        throw new ForbiddenError('Not authorized or skill not found');
    }

    const normalizedCategory = String(category || '').trim();
    if (!normalizedCategory) {
        throw new ValidationError('Category is required');
    }

    const conflict = await prisma.userSkill.findFirst({
        where: {
            userId,
            skillId: userSkill.skillId,
            type,
            id: { not: userSkillId }
        }
    });

    if (conflict) {
        throw new ValidationError('You already have this skill with the selected type');
    }

    return await prisma.$transaction(async (tx) => {
        await tx.skill.update({
            where: { id: userSkill.skillId },
            data: { category: normalizedCategory }
        });

        await tx.userSkill.update({
            where: { id: userSkillId },
            data: {
                type,
                level
            }
        });

        return tx.userSkill.findUnique({
            where: { id: userSkillId },
            include: { skill: true, preview: true }
        });
    });
};

export const reorderUserSkillsService = async (userId, skillIds = []) => {
    const normalizedIds = Array.isArray(skillIds)
        ? skillIds.map((id) => Number.parseInt(id, 10)).filter((id) => Number.isInteger(id))
        : [];

    if (!normalizedIds.length) {
        throw new ValidationError('Skill order payload is required');
    }

    const ownedSkills = await prisma.userSkill.findMany({
        where: { userId },
        select: { id: true }
    });

    const ownedIds = new Set(ownedSkills.map((row) => row.id));
    if (normalizedIds.some((id) => !ownedIds.has(id))) {
        throw new ForbiddenError('Not authorized to reorder one or more skills');
    }

    try {
        await prisma.$transaction(
            normalizedIds.map((id, index) => prisma.userSkill.update({
                where: { id },
                data: { displayOrder: index }
            }))
        );
    } catch (error) {
        if (isMissingDisplayOrderColumnError(error)) {
            throw new ValidationError('Skill reordering requires the latest database migration');
        }
        throw error;
    }

    return { message: 'Skill order updated' };
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
