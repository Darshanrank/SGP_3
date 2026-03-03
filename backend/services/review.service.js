import prisma from '../prisma/client.js';
import { NotFound, ValidationError, ForbiddenError } from '../errors/generic.errors.js';

/**
 * Submit a review for a completed SwapClass
 */
export const createReviewService = async (reviewerId, data) => {
    const { swapClassId, rating, comment } = data;

    if (!rating || rating < 1 || rating > 5) {
        throw new ValidationError('Rating must be between 1 and 5');
    }

    const swapClass = await prisma.swapClass.findUnique({
        where: { id: swapClassId },
        include: { swapRequest: true, completion: true }
    });

    if (!swapClass) throw new NotFound('Swap class not found');

    if (swapClass.status !== 'COMPLETED') {
        throw new ValidationError('Can only review completed classes');
    }

    const { fromUserId, toUserId } = swapClass.swapRequest;
    const isUser1 = fromUserId === reviewerId;
    const isUser2 = toUserId === reviewerId;

    if (!isUser1 && !isUser2) {
        throw new ForbiddenError('Not authorized to review this class');
    }

    const revieweeId = isUser1 ? toUserId : fromUserId;

    // Check duplicate
    const existing = await prisma.swapReview.findUnique({
        where: { swapClassId_reviewerId: { swapClassId, reviewerId } }
    });

    if (existing) {
        throw new ValidationError('You have already reviewed this class');
    }

    return await prisma.swapReview.create({
        data: {
            swapClassId,
            reviewerId,
            revieweeId,
            rating: parseInt(rating),
            comment: comment || null
        },
        include: {
            reviewer: { select: { userId: true, username: true } },
            reviewee: { select: { userId: true, username: true } }
        }
    });
};

/**
 * Get reviews for a specific swap class
 */
export const getClassReviewsService = async (swapClassId) => {
    return await prisma.swapReview.findMany({
        where: { swapClassId },
        include: {
            reviewer: { select: { userId: true, username: true } },
            reviewee: { select: { userId: true, username: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
};

/**
 * Get all reviews received by a user (for public profile)
 */
export const getUserReviewsService = async (userId, { page = 1, limit = 10 } = {}) => {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
        prisma.swapReview.findMany({
            where: { revieweeId: userId },
            include: {
                reviewer: {
                    select: { userId: true, username: true, profile: { select: { avatarUrl: true } } }
                },
                swapClass: {
                    include: {
                        swapRequest: {
                            include: {
                                teachSkill: { include: { skill: true } },
                                learnSkill: { include: { skill: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        }),
        prisma.swapReview.count({ where: { revieweeId: userId } })
    ]);

    return {
        data: reviews,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
};

/**
 * Get aggregate rating stats for a user
 */
export const getUserRatingService = async (userId) => {
    const result = await prisma.swapReview.aggregate({
        where: { revieweeId: userId },
        _avg: { rating: true },
        _count: { rating: true }
    });

    return {
        avgRating: result._avg.rating ? Math.round(result._avg.rating * 10) / 10 : 0,
        reviewCount: result._count.rating
    };
};

/**
 * Check if the current user has already reviewed a class
 */
export const hasReviewedClassService = async (userId, swapClassId) => {
    const review = await prisma.swapReview.findUnique({
        where: { swapClassId_reviewerId: { swapClassId, reviewerId: userId } }
    });
    return { hasReviewed: !!review, review };
};
