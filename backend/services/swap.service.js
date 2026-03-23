import prisma from '../prisma/client.js';
import { NotFound, ValidationError, ForbiddenError } from '../errors/generic.errors.js';
import { assertUserInClass } from '../utils/assertUserInClass.js';
import { evaluateBadges } from '../utils/badgeEvaluator.js';
import { assertUsersNotBlocked } from './block.service.js';
import sanitizeHtml from 'sanitize-html';
import { createNotificationForUserService } from './notification.service.js';

const sanitizePlainText = (value) => sanitizeHtml(String(value || ''), { allowedTags: [], allowedAttributes: {} }).trim();

const ensureClassOwnership = async (userId, classId) => {
    await assertUserInClass(userId, classId);
};

const assertValidHttpUrl = (value, fieldName = 'url') => {
    try {
        const parsed = new URL(value);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            throw new ValidationError(`Invalid ${fieldName}`);
        }
    } catch (_) {
        throw new ValidationError(`Invalid ${fieldName}`);
    }
};

export const createSwapRequestService = async (fromUserId, data, { io } = {}) => {
    const { toUserId, teachSkillId, learnSkillId, message } = data;

    if (fromUserId === toUserId) {
        throw new ValidationError('You cannot create a swap request with yourself', 'INVALID_SWAP_TARGET');
    }

    const targetUser = await prisma.users.findUnique({ where: { userId: toUserId } });
    if (!targetUser) throw new NotFound('Target user not found');

    await assertUsersNotBlocked(fromUserId, toUserId);

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

    await createNotificationForUserService({
        userId: toUserId,
        type: 'SWAP_REQUEST',
        message: 'You have a new swap request!',
        link: '/swaps',
        metadata: { requestId: request.id, fromUserId },
        io
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
                teachSkill: { include: { skill: true, preview: true } },
                learnSkill: { include: { skill: true, preview: true } },
                swapClass: { select: { id: true } }
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

export const updateRequestStatusService = async (userId, requestId, data, { io } = {}) => {
    const { status, cancelReason } = data;
    const normalizedCancelReason = typeof cancelReason === 'string' ? cancelReason.trim() : '';
    const allowedStatuses = ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'];
    if (!allowedStatuses.includes(status)) {
        throw new ValidationError('Invalid status');
    }

    const request = await prisma.swapRequest.findUnique({
        where: { id: requestId },
        include: {
            swapClass: {
                select: { status: true }
            }
        }
    });
    if (!request) throw new NotFound('Request not found');

    if (request.toUserId !== userId && request.fromUserId !== userId) {
        throw new ForbiddenError('Not authorized');
    }

    if (status === 'ACCEPTED' || status === 'REJECTED') {
        if (request.toUserId !== userId) throw new ForbiddenError('Only receiver can accept/reject');
    }

    if (status === 'CANCELLED') {
        if (request.fromUserId !== userId) {
            throw new ForbiddenError('Only sender can cancel this request');
        }
        if (!normalizedCancelReason || normalizedCancelReason.length < 5) {
            throw new ValidationError('Cancel reason must be at least 5 characters');
        }
        if (request.swapClass?.status === 'COMPLETED') {
            throw new ValidationError('Cannot cancel a completed swap class');
        }
    }

    if (request.status === 'REJECTED' || request.status === 'CANCELLED') {
        throw new ValidationError('Request is already closed');
    }

    if (request.status !== 'PENDING' && status !== 'CANCELLED') {
        throw new ValidationError('Request is already processed');
    }

    const notifyUserId = request.fromUserId === userId ? request.toUserId : request.fromUserId;

    const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.swapRequest.update({
            where: { id: requestId },
            data: {
                status,
                cancelReason: status === 'CANCELLED' ? normalizedCancelReason : null
            }
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
        }

        if (status === 'CANCELLED') {
            await tx.swapClass.updateMany({
                where: { swapRequestId: request.id },
                data: { status: 'CANCELLED', endedAt: new Date() }
            });
        }

        return updated;
    });

    if (status === 'ACCEPTED') {
        await createNotificationForUserService({
            userId: notifyUserId,
            type: 'ACCEPTED',
            message: 'Your swap request has been accepted!',
            link: '/swaps',
            metadata: { requestId },
            io
        });
    }

    if (status === 'REJECTED') {
        await createNotificationForUserService({
            userId: notifyUserId,
            type: 'SYSTEM',
            message: 'Your swap request was rejected.',
            link: '/swaps',
            metadata: { requestId, status },
            io
        });
    }

    if (status === 'CANCELLED') {
        await createNotificationForUserService({
            userId: notifyUserId,
            type: 'SYSTEM',
            message: 'A swap request was cancelled.',
            link: '/swaps',
            metadata: { requestId, status },
            io
        });
    }

    return result;
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
                        fromUser: { select: { username: true, userId: true } },
                        toUser: { select: { username: true, userId: true } },
                        teachSkill: { include: { skill: true, preview: true } },
                        learnSkill: { include: { skill: true, preview: true } }
                    }
                },
                completion: true
            },
            orderBy: { id: 'desc' },
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

export const getClassDetailsService = async (userId, classId) => {
    await assertUserInClass(userId, classId);
    return await prisma.swapClass.findUnique({
        where: { id: classId },
        include: {
            todos: true,
            pinnedResources: {
                include: {
                    creator: { select: { userId: true, username: true } }
                },
                orderBy: { createdAt: 'desc' }
            },
            codeSnippets: {
                include: {
                    creator: { select: { userId: true, username: true } }
                },
                orderBy: { createdAt: 'desc' }
            },
            classroomFiles: {
                include: {
                    uploader: { select: { userId: true, username: true } }
                },
                orderBy: { createdAt: 'desc' }
            },
            sharedNote: true,
            chatRoom: true,
            completion: true,
            reviews: {
                include: {
                    reviewer: { select: { userId: true, username: true } },
                    reviewee: { select: { userId: true, username: true } }
                }
            },
            swapRequest: {
                include: {
                    fromUser: { select: { userId: true, username: true } },
                    toUser: { select: { userId: true, username: true } },
                    teachSkill: { include: { skill: true } },
                    learnSkill: { include: { skill: true } }
                }
            }
        }
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

    return await prisma.$transaction(async (tx) => {
        await tx.swapCompletion.upsert({
            where: { swapClassId: classId },
            create: {
                swapClassId: classId,
                completedByUser1: isUser1,
                completedByUser2: isUser2,
                completedAt: null
            },
            update: {
                completedByUser1: isUser1 ? true : undefined,
                completedByUser2: isUser2 ? true : undefined
            }
        });

        const updatedCompletion = await tx.swapCompletion.findUnique({
             where: { swapClassId: classId }
        });

        if (updatedCompletion.completedByUser1 && updatedCompletion.completedByUser2 && !updatedCompletion.completedAt) {
             await tx.swapCompletion.update({
                 where: { swapClassId: classId },
                 data: { completedAt: new Date() }
             });
             
             await tx.swapClass.update({
                 where: { id: classId },
                 data: { status: 'COMPLETED', endedAt: new Date() }
             });

             await tx.userReward.upsert({
                 where: { userId: swapClass.swapRequest.fromUserId },
                 create: { userId: swapClass.swapRequest.fromUserId, points: 10, totalSwaps: 1 },
                 update: { points: { increment: 10 }, totalSwaps: { increment: 1 } }
             });
             await tx.userReward.upsert({
                 where: { userId: swapClass.swapRequest.toUserId },
                 create: { userId: swapClass.swapRequest.toUserId, points: 10, totalSwaps: 1 },
                 update: { points: { increment: 10 }, totalSwaps: { increment: 1 } }
             });
        }

        return updatedCompletion;
    });

    // Evaluate badges outside the transaction (non-critical, fire-and-forget)
    const finalCompletion = await prisma.swapCompletion.findUnique({ where: { swapClassId: classId } });
    if (finalCompletion?.completedByUser1 && finalCompletion?.completedByUser2) {
        Promise.all([
            evaluateBadges(swapClass.swapRequest.fromUserId),
            evaluateBadges(swapClass.swapRequest.toUserId),
        ]).catch(() => {}); // fire-and-forget
    }

    return finalCompletion;
};

export const getPinnedResourcesService = async (userId, classId) => {
    await ensureClassOwnership(userId, classId);

    return prisma.pinnedResource.findMany({
        where: { swapClassId: classId },
        include: {
            creator: { select: { userId: true, username: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
};

export const addPinnedResourceService = async (userId, classId, data) => {
    await ensureClassOwnership(userId, classId);

    const title = sanitizePlainText(data?.title);
    const url = String(data?.url || '').trim();

    if (!title) {
        throw new ValidationError('Resource title is required');
    }
    if (!url) {
        throw new ValidationError('Resource URL is required');
    }
    assertValidHttpUrl(url, 'resource URL');

    return prisma.pinnedResource.create({
        data: {
            swapClassId: classId,
            title,
            url,
            createdBy: userId
        },
        include: {
            creator: { select: { userId: true, username: true } }
        }
    });
};

export const deletePinnedResourceService = async (userId, classId, resourceId) => {
    await ensureClassOwnership(userId, classId);

    const resource = await prisma.pinnedResource.findUnique({
        where: { id: resourceId }
    });

    if (!resource || resource.swapClassId !== classId) {
        throw new NotFound('Pinned resource not found');
    }

    await prisma.pinnedResource.delete({ where: { id: resourceId } });
    return { success: true };
};

export const getCodeSnippetsService = async (userId, classId) => {
    await ensureClassOwnership(userId, classId);

    return prisma.codeSnippet.findMany({
        where: { swapClassId: classId },
        include: {
            creator: { select: { userId: true, username: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
};

export const addCodeSnippetService = async (userId, classId, data) => {
    await ensureClassOwnership(userId, classId);

    const title = sanitizePlainText(data?.title);
    const language = sanitizePlainText(data?.language || 'text').toLowerCase();
    const code = sanitizeHtml(String(data?.code || ''), { allowedTags: [], allowedAttributes: {} });

    if (!title) {
        throw new ValidationError('Snippet title is required');
    }
    if (!code.trim()) {
        throw new ValidationError('Snippet code is required');
    }

    return prisma.codeSnippet.create({
        data: {
            swapClassId: classId,
            title,
            language: language || 'text',
            code,
            createdBy: userId
        },
        include: {
            creator: { select: { userId: true, username: true } }
        }
    });
};

export const deleteCodeSnippetService = async (userId, classId, snippetId) => {
    await ensureClassOwnership(userId, classId);

    const snippet = await prisma.codeSnippet.findUnique({
        where: { id: snippetId }
    });

    if (!snippet || snippet.swapClassId !== classId) {
        throw new NotFound('Code snippet not found');
    }

    await prisma.codeSnippet.delete({ where: { id: snippetId } });
    return { success: true };
};

export const getClassroomFilesService = async (userId, classId) => {
    await ensureClassOwnership(userId, classId);

    return prisma.classroomFile.findMany({
        where: { swapClassId: classId },
        include: {
            uploader: { select: { userId: true, username: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
};

export const addClassroomFileService = async (userId, classId, data) => {
    await ensureClassOwnership(userId, classId);

    const fileName = sanitizePlainText(data?.fileName);
    const fileUrl = String(data?.fileUrl || '').trim();

    if (!fileName || !fileUrl) {
        throw new ValidationError('File name and URL are required');
    }

    return prisma.classroomFile.create({
        data: {
            swapClassId: classId,
            fileName,
            fileUrl,
            uploadedBy: userId
        },
        include: {
            uploader: { select: { userId: true, username: true } }
        }
    });
};

export const deleteClassroomFileService = async (userId, classId, fileId) => {
    await ensureClassOwnership(userId, classId);

    const file = await prisma.classroomFile.findUnique({ where: { id: fileId } });
    if (!file || file.swapClassId !== classId) {
        throw new NotFound('Classroom file not found');
    }

    await prisma.classroomFile.delete({ where: { id: fileId } });
    return { success: true };
};

export const getSharedNoteService = async (userId, classId) => {
    await ensureClassOwnership(userId, classId);

    const note = await prisma.sharedNote.findUnique({
        where: { swapClassId: classId }
    });

    if (note) return note;

    return prisma.sharedNote.create({
        data: {
            swapClassId: classId,
            content: ''
        }
    });
};

export const upsertSharedNoteService = async (userId, classId, data) => {
    await ensureClassOwnership(userId, classId);

    const content = sanitizeHtml(String(data?.content || ''), { allowedTags: [], allowedAttributes: {} });

    return prisma.sharedNote.upsert({
        where: { swapClassId: classId },
        create: {
            swapClassId: classId,
            content
        },
        update: {
            content
        }
    });
};
