import { PrismaClient } from '@prisma/client';
import { NotFound, ValidationError, ForbiddenError } from '../errors/generic.errors.js';

const prisma = new PrismaClient();

export const createSwapRequestService = async (fromUserId, data) => {
    const { toUserId, teachSkillId, learnSkillId, message } = data;

    // Validate own skill (optional now)
    if (teachSkillId) {
        const teachSkill = await prisma.userSkill.findFirst({
            where: { id: teachSkillId, userId: fromUserId, type: 'TEACH' }
        });

        if (!teachSkill) throw new ValidationError('Invalid teaching skill');
    }

    // Validate target skill
    const learnSkill = await prisma.userSkill.findFirst({
        where: { id: learnSkillId, userId: toUserId, type: 'TEACH' }
    });

    if (!learnSkill) throw new ValidationError('Target skill not found');

    const request = await prisma.swapRequest.create({
        data: {
            fromUserId,
            toUserId,
            teachSkillId: teachSkillId ? parseInt(teachSkillId) : null,
            learnSkillId: parseInt(learnSkillId),
            message: message || null
        }
    });

    // Create Notification
    await prisma.notification.create({
        data: {
            userId: toUserId,
            type: 'SWAP_REQUEST',
            message: `You have a new swap request!`
        }
    });

    return request;
};

export const getMyRequestsService = async (userId, type) => {
    const whereClause = type === 'sent' ? { fromUserId: userId } : { toUserId: userId };

    return await prisma.swapRequest.findMany({
        where: whereClause,
        include: {
            fromUser: { select: { username: true, userId: true } },
            toUser: { select: { username: true, userId: true } },
            teachSkill: { include: { skill: true } },
            learnSkill: { include: { skill: true } }
        }
    });
};

export const updateRequestStatusService = async (userId, requestId, data) => {
    const { status, cancelReason } = data;

    const request = await prisma.swapRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFound('Request not found');

    if (request.toUserId !== userId && request.fromUserId !== userId) {
        throw new ForbiddenError('Not authorized');
    }

    if (status === 'ACCEPTED' || status === 'REJECTED') {
        if (request.toUserId !== userId) throw new ForbiddenError('Only receiver can accept/reject');
    }

    const updated = await prisma.swapRequest.update({
        where: { id: requestId },
        data: { status, cancelReason }
    });

    const notifyUserId = request.fromUserId === userId ? request.toUserId : request.fromUserId;

    if (status === 'ACCEPTED') {
        await prisma.swapClass.create({
            data: { swapRequestId: request.id }
        });

        await prisma.notification.create({
            data: {
                userId: notifyUserId,
                type: 'ACCEPTED',
                message: `Your swap request has been accepted!`
            }
        });
    }

    return updated;
};

export const getMyClassesService = async (userId) => {
    return await prisma.swapClass.findMany({
        where: {
            swapRequest: {
                OR: [
                    { fromUserId: userId },
                    { toUserId: userId }
                ]
            }
        },
        include: {
            swapRequest: {
                include: {
                    fromUser: { select: { username: true } },
                    toUser: { select: { username: true } },
                    teachSkill: { include: { skill: true } },
                    learnSkill: { include: { skill: true } }
                }
            },
            completion: true
        }
    });
};

export const getClassDetailsService = async (classId) => {
    const swapClass = await prisma.swapClass.findUnique({
        where: { id: classId },
        include: { todos: true, chatRoom: true, swapRequest: true }
    });
    if (!swapClass) throw new NotFound('Class not found');
    return swapClass;
};

export const addClassTodoService = async (classId, data) => {
    const { title, description, dueDate } = data;
    
    return await prisma.classTodo.create({
        data: {
            swapClassId: classId,
            title,
            description,
            dueDate: dueDate ? new Date(dueDate) : null
        }
    });
};

export const toggleTodoService = async (todoId, isCompleted) => {
    return await prisma.classTodo.update({
        where: { id: todoId },
        data: { isCompleted }
    });
};

export const completeClassService = async (userId, classId) => {
    const swapClass = await prisma.swapClass.findUnique({
        where: { id: classId },
        include: { swapRequest: true }
    });
    
    if (!swapClass) throw new NotFound('Class not found');
    
    const isUser1 = swapClass.swapRequest.fromUserId === userId;
    const isUser2 = swapClass.swapRequest.toUserId === userId;

    if (!isUser1 && !isUser2) throw new ForbiddenError('Not authorized');

    await prisma.swapCompletion.upsert({
        where: { swapClassId: classId },
        create: {
            swapClassId: classId,
            completedByUser1: isUser1,
            completedByUser2: isUser2,
            completedAt: (isUser1 && isUser2) ? new Date() : null
        },
        update: {
            completedByUser1: isUser1 ? true : undefined,
            completedByUser2: isUser2 ? true : undefined
        }
    });

    const updatedCompletion = await prisma.swapCompletion.findUnique({
         where: { swapClassId: classId }
    });

    if (updatedCompletion.completedByUser1 && updatedCompletion.completedByUser2 && !updatedCompletion.completedAt) {
         await prisma.swapCompletion.update({
             where: { swapClassId: classId },
             data: { completedAt: new Date() }
         });
         
         await prisma.swapClass.update({
             where: { id: classId },
             data: { status: 'COMPLETED', endedAt: new Date() }
         });

         await prisma.userReward.upsert({
             where: { userId: swapClass.swapRequest.fromUserId },
             create: { userId: swapClass.swapRequest.fromUserId, points: 10, totalSwaps: 1 },
             update: { points: { increment: 10 }, totalSwaps: { increment: 1 } }
         });
         await prisma.userReward.upsert({
             where: { userId: swapClass.swapRequest.toUserId },
             create: { userId: swapClass.swapRequest.toUserId, points: 10, totalSwaps: 1 },
             update: { points: { increment: 10 }, totalSwaps: { increment: 1 } }
         });
    }

    return updatedCompletion;
};
