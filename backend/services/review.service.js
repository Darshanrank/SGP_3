import prisma from '../prisma/client.js';
import { NotFound, ValidationError, ForbiddenError } from '../errors/generic.errors.js';

const RATING_FIELDS = [
    'clarityRating',
    'punctualityRating',
    'communicationRating',
    'expertiseRating'
];

const RECENT_REVIEW_WINDOW_DAYS = 14;

const normalizeScore = (value, label) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
        throw new ValidationError(`${label} must be between 1 and 5`);
    }
    return parsed;
};

const calculateOverallRating = (ratings) => {
    const total = ratings.reduce((sum, score) => sum + score, 0);
    return Math.round(total / ratings.length);
};

const isRecentReview = (createdAt) => {
    const created = new Date(createdAt).getTime();
    const threshold = Date.now() - (RECENT_REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    return created >= threshold;
};

const mapReviewForResponse = (review, currentUserId) => {
    const completedClass = Boolean(
        review?.swapClass?.completion?.completedByUser1 && review?.swapClass?.completion?.completedByUser2
    );
    const hasHelpfulVote = Array.isArray(review?.helpfulVoteRecords)
        ? review.helpfulVoteRecords.some((vote) => vote.userId === currentUserId)
        : false;

    const { helpfulVoteRecords, ...rest } = review;

    return {
        ...rest,
        completedClass,
        recentReview: isRecentReview(review.createdAt),
        hasHelpfulVote
    };
};

export const createReviewService = async (reviewerId, data) => {
    const swapClassId = Number.parseInt(data?.swapClassId, 10);
    if (!Number.isInteger(swapClassId)) {
        throw new ValidationError('Invalid swap class id');
    }

    const clarityRating = normalizeScore(data?.clarityRating, 'Clarity rating');
    const punctualityRating = normalizeScore(data?.punctualityRating, 'Punctuality rating');
    const communicationRating = normalizeScore(data?.communicationRating, 'Communication rating');
    const expertiseRating = normalizeScore(data?.expertiseRating, 'Expertise rating');
    const overallRating = calculateOverallRating([
        clarityRating,
        punctualityRating,
        communicationRating,
        expertiseRating
    ]);

    const comment = typeof data?.comment === 'string' ? data.comment.trim() : '';

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

    const created = await prisma.swapReview.create({
        data: {
            swapClassId,
            reviewerId,
            revieweeId,
            clarityRating,
            punctualityRating,
            communicationRating,
            expertiseRating,
            overallRating,
            comment: comment || null,
            verifiedSwap: true
        },
        include: {
            reviewer: { select: { userId: true, username: true } },
            reviewee: { select: { userId: true, username: true } },
            swapClass: {
                select: {
                    completion: {
                        select: {
                            completedByUser1: true,
                            completedByUser2: true
                        }
                    }
                }
            },
            helpfulVoteRecords: {
                where: { userId: reviewerId },
                select: { userId: true }
            }
        }
    });

    return mapReviewForResponse(created, reviewerId);
};

export const getClassReviewsService = async (swapClassId, currentUserId) => {
    const reviews = await prisma.swapReview.findMany({
        where: { swapClassId },
        include: {
            reviewer: { select: { userId: true, username: true } },
            reviewee: { select: { userId: true, username: true } },
            swapClass: {
                select: {
                    completion: {
                        select: {
                            completedByUser1: true,
                            completedByUser2: true
                        }
                    }
                }
            },
            helpfulVoteRecords: {
                where: currentUserId ? { userId: currentUserId } : undefined,
                select: { userId: true }
            }
        },
        orderBy: [
            { helpfulVotes: 'desc' },
            { createdAt: 'desc' }
        ]
    });

    return reviews.map((review) => mapReviewForResponse(review, currentUserId));
};

export const getUserReviewsService = async (userId, { page = 1, limit = 10, currentUserId } = {}) => {
    const skip = (page - 1) * limit;

    const [reviews, total, mostHelpfulReview] = await Promise.all([
        prisma.swapReview.findMany({
            where: { revieweeId: userId },
            include: {
                reviewer: {
                    select: { userId: true, username: true, profile: { select: { avatarUrl: true } } }
                },
                swapClass: {
                    include: {
                        completion: {
                            select: {
                                completedByUser1: true,
                                completedByUser2: true
                            }
                        },
                        swapRequest: {
                            include: {
                                teachSkill: { include: { skill: true } },
                                learnSkill: { include: { skill: true } }
                            }
                        }
                    }
                },
                helpfulVoteRecords: {
                    where: currentUserId ? { userId: currentUserId } : undefined,
                    select: { userId: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        }),
        prisma.swapReview.count({ where: { revieweeId: userId } }),
        prisma.swapReview.findFirst({
            where: { revieweeId: userId },
            include: {
                reviewer: {
                    select: { userId: true, username: true, profile: { select: { avatarUrl: true } } }
                },
                swapClass: {
                    include: {
                        completion: {
                            select: {
                                completedByUser1: true,
                                completedByUser2: true
                            }
                        },
                        swapRequest: {
                            include: {
                                teachSkill: { include: { skill: true } },
                                learnSkill: { include: { skill: true } }
                            }
                        }
                    }
                },
                helpfulVoteRecords: {
                    where: currentUserId ? { userId: currentUserId } : undefined,
                    select: { userId: true }
                }
            },
            orderBy: [
                { helpfulVotes: 'desc' },
                { createdAt: 'desc' }
            ]
        })
    ]);

    const mappedReviews = reviews.map((review) => mapReviewForResponse(review, currentUserId));
    const mappedMostHelpful = mostHelpfulReview
        ? mapReviewForResponse(mostHelpfulReview, currentUserId)
        : null;

    return {
        data: mappedReviews,
        mostHelpfulReview: mappedMostHelpful,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
};

export const getUserRatingService = async (userId) => {
    const result = await prisma.swapReview.aggregate({
        where: { revieweeId: userId },
        _avg: {
            overallRating: true,
            clarityRating: true,
            punctualityRating: true,
            communicationRating: true,
            expertiseRating: true
        },
        _count: { overallRating: true }
    });

    const overallRating = result._avg.overallRating ? Math.round(result._avg.overallRating * 10) / 10 : 0;

    return {
        overallRating,
        avgRating: overallRating,
        reviewCount: result._count.overallRating,
        clarityRating: result._avg.clarityRating ? Math.round(result._avg.clarityRating * 10) / 10 : 0,
        punctualityRating: result._avg.punctualityRating ? Math.round(result._avg.punctualityRating * 10) / 10 : 0,
        communicationRating: result._avg.communicationRating ? Math.round(result._avg.communicationRating * 10) / 10 : 0,
        expertiseRating: result._avg.expertiseRating ? Math.round(result._avg.expertiseRating * 10) / 10 : 0
    };
};

export const hasReviewedClassService = async (userId, swapClassId) => {
    const review = await prisma.swapReview.findUnique({
        where: { swapClassId_reviewerId: { swapClassId, reviewerId: userId } },
        include: {
            swapClass: {
                select: {
                    completion: {
                        select: {
                            completedByUser1: true,
                            completedByUser2: true
                        }
                    }
                }
            },
            helpfulVoteRecords: {
                where: { userId },
                select: { userId: true }
            }
        }
    });

    return {
        hasReviewed: !!review,
        review: review ? mapReviewForResponse(review, userId) : null
    };
};

export const markReviewHelpfulService = async (userId, reviewId) => {
    const normalizedReviewId = Number.parseInt(reviewId, 10);
    if (!Number.isInteger(normalizedReviewId)) {
        throw new ValidationError('Invalid review id');
    }

    const review = await prisma.swapReview.findUnique({
        where: { id: normalizedReviewId },
        select: { id: true, reviewerId: true, helpfulVotes: true }
    });

    if (!review) {
        throw new NotFound('Review not found');
    }

    if (review.reviewerId === userId) {
        throw new ValidationError('You cannot vote helpful on your own review');
    }

    const existingVote = await prisma.reviewHelpfulVote.findUnique({
        where: {
            reviewId_userId: {
                reviewId: normalizedReviewId,
                userId
            }
        }
    });

    if (existingVote) {
        return {
            reviewId: normalizedReviewId,
            helpfulVotes: review.helpfulVotes,
            alreadyVoted: true
        };
    }

    const updatedReview = await prisma.$transaction(async (tx) => {
        await tx.reviewHelpfulVote.create({
            data: {
                reviewId: normalizedReviewId,
                userId
            }
        });

        return tx.swapReview.update({
            where: { id: normalizedReviewId },
            data: {
                helpfulVotes: { increment: 1 }
            },
            select: {
                id: true,
                helpfulVotes: true
            }
        });
    });

    return {
        reviewId: updatedReview.id,
        helpfulVotes: updatedReview.helpfulVotes,
        alreadyVoted: false
    };
};
