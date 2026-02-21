import prisma from '../prisma/client.js';
import { NotFound, ValidationError, ForbiddenError } from '../errors/generic.errors.js';

export const createSwapRequestService = async (fromUserId, data) => {
    const { toUserId, teachSkillId, learnSkillId, message } = data;

    if (fromUserId === toUserId) {
        throw new ValidationError('You cannot create a swap request with yourself', 'INVALID_SWAP_TARGET');
    }

    const targetUser = await prisma.users.findUnique({ where: { userId: toUserId } });
    if (!targetUser) throw new NotFound('Target user not found');

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

    const existing = await prisma.swapRequest.findFirst({
        where: {
            fromUserId,
            toUserId,
            learnSkillId: parseInt(learnSkillId),
            status: 'PENDING'
        }
    });

    if (existing) {
        throw new ValidationError('A pending swap request already exists');
    }

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

export const getMyRequestsService = async (userId, type, { page = 1, limit = 20 } = {}) => {
    const whereClause = type === 'sent'
        ? { fromUserId: userId }
        : type === 'received'
            ? { toUserId: userId }
            : { OR: [{ fromUserId: userId }, { toUserId: userId }] };

    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
        prisma.swapRequest.findMany({
            where: whereClause,
            include: {
                fromUser: { select: { username: true, userId: true } },
                toUser: { select: { username: true, userId: true } },
                teachSkill: { include: { skill: true } },
                learnSkill: { include: { skill: true } }
            },
            orderBy: { id: 'desc' },
            skip,
            take: limit
        }),
        prisma.swapRequest.count({ where: whereClause })
    ]);

    return {
        data: requests,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
};

export const updateRequestStatusService = async (userId, requestId, data) => {
    const { status, cancelReason } = data;
    const allowedStatuses = ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'];
    if (!allowedStatuses.includes(status)) {
        throw new ValidationError('Invalid status');
    }

    const request = await prisma.swapRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFound('Request not found');

    if (request.toUserId !== userId && request.fromUserId !== userId) {
        throw new ForbiddenError('Not authorized');
    }

    if (status === 'ACCEPTED' || status === 'REJECTED') {
        if (request.toUserId !== userId) throw new ForbiddenError('Only receiver can accept/reject');
    }

    if (status === 'CANCELLED' && request.fromUserId !== userId && request.toUserId !== userId) {
        throw new ForbiddenError('Not authorized');
    }

    if (request.status === 'REJECTED' || request.status === 'CANCELLED') {
        throw new ValidationError('Request is already closed');
    }

    if (request.status !== 'PENDING' && status !== 'CANCELLED') {
        throw new ValidationError('Request is already processed');
    }

    const notifyUserId = request.fromUserId === userId ? request.toUserId : request.fromUserId;

    return await prisma.$transaction(async (tx) => {
        const updated = await tx.swapRequest.update({
            where: { id: requestId },
            data: { status, cancelReason: cancelReason || null }
        });

        if (status === 'ACCEPTED') {
            const existingClass = await tx.swapClass.findUnique({
                where: { swapRequestId: request.id }
            });
            if (!existingClass) {
                await tx.swapClass.create({
                    data: { swapRequestId: request.id }
                });
            }

            await tx.notification.create({
                data: {
                    userId: notifyUserId,
                    type: 'ACCEPTED',
                    message: 'Your swap request has been accepted!'
                }
            });
        }

        if (status === 'REJECTED') {
            await tx.notification.create({
                data: {
                    userId: notifyUserId,
                    type: 'SYSTEM',
                    message: 'Your swap request was rejected.'
                }
            });
        }

        if (status === 'CANCELLED') {
            await tx.swapClass.updateMany({
                where: { swapRequestId: request.id },
                data: { status: 'CANCELLED', endedAt: new Date() }
            });
            await tx.notification.create({
                data: {
                    userId: notifyUserId,
                    type: 'SYSTEM',
                    message: 'A swap request was cancelled.'
                }
            });
        }

        return updated;
    });
};

export const getMyClassesService = async (userId, { page = 1, limit = 20 } = {}) => {
    const skip = (page - 1) * limit;
    const where = {
        swapRequest: {
            OR: [
                { fromUserId: userId },
                { toUserId: userId }
            ]
        }
    };

    const [classes, total] = await Promise.all([
        prisma.swapClass.findMany({
            where,
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
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        }),
        prisma.swapClass.count({ where })
    ]);

    return {
        data: classes,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
};

const assertUserInClass = async (userId, classId) => {
    const swapClass = await prisma.swapClass.findUnique({
        where: { id: classId },
        include: {
            swapRequest: { select: { fromUserId: true, toUserId: true } }
        }
    });

    if (!swapClass) throw new NotFound('Class not found');

    const isMember = swapClass.swapRequest.fromUserId === userId || swapClass.swapRequest.toUserId === userId;
    if (!isMember) throw new ForbiddenError('Not authorized');

    return swapClass;
};

export const getClassDetailsService = async (userId, classId) => {
    await assertUserInClass(userId, classId);
    return await prisma.swapClass.findUnique({
        where: { id: classId },
        include: { todos: true, chatRoom: true, swapRequest: true }
    });
};

export const addClassTodoService = async (userId, classId, data) => {
    const { title, description, dueDate } = data;

    await assertUserInClass(userId, classId);
    
    return await prisma.classTodo.create({
        data: {
            swapClassId: classId,
            title,
            description,
            dueDate: dueDate ? new Date(dueDate) : null
        }
    });
};

export const toggleTodoService = async (userId, todoId, isCompleted) => {
    const todo = await prisma.classTodo.findUnique({
        where: { id: todoId },
        include: {
            swapClass: { include: { swapRequest: { select: { fromUserId: true, toUserId: true } } } }
        }
    });

    if (!todo) throw new NotFound('Todo not found');

    const isMember = todo.swapClass.swapRequest.fromUserId === userId || todo.swapClass.swapRequest.toUserId === userId;
    if (!isMember) throw new ForbiddenError('Not authorized');

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

    if (swapClass.status === 'CANCELLED') {
        throw new ValidationError('Cannot complete a cancelled class');
    }

    if (swapClass.status === 'COMPLETED') {
        return await prisma.swapCompletion.findUnique({
            where: { swapClassId: classId }
        });
    }

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
