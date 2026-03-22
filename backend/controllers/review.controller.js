import {
    createReviewService,
    getClassReviewsService,
    getUserReviewsService,
    getUserRatingService,
    hasReviewedClassService,
    markReviewHelpfulService
} from '../services/review.service.js';
import { ValidationError } from '../errors/generic.errors.js';
import { createNotificationForUserService } from '../services/notification.service.js';

export const createReview = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const io = req.app.get('io');
        const review = await createReviewService(userId, req.body);

        await createNotificationForUserService({
            userId: review.revieweeId,
            type: 'SYSTEM',
            message: `${review.reviewer.username} left you a ${review.overallRating}-star review!`,
            link: `/u/${review.reviewee?.username || ''}`,
            metadata: { reviewId: review.id, swapClassId: review.swapClassId },
            io
        });

        res.status(201).json(review);
    } catch (error) {
        next(error);
    }
};

export const markReviewHelpful = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const reviewId = Number.parseInt(req.params.id, 10);
        if (!Number.isInteger(reviewId)) {
            throw new ValidationError('Invalid review id');
        }

        const result = await markReviewHelpfulService(userId, reviewId);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const getClassReviews = async (req, res, next) => {
    try {
        const classId = parseInt(req.params.classId);
        if (!Number.isInteger(classId)) {
            throw new ValidationError('Invalid class id');
        }
        const currentUserId = req.user?.userId;
        const reviews = await getClassReviewsService(classId, currentUserId);
        res.json(reviews);
    } catch (error) {
        next(error);
    }
};

export const getUserReviews = async (req, res, next) => {
    try {
        const userId = parseInt(req.params.userId);
        if (!Number.isInteger(userId)) {
            throw new ValidationError('Invalid user id');
        }
        const page = Number.parseInt(req.query.page, 10) || 1;
        const limit = Number.parseInt(req.query.limit, 10) || 10;
        const currentUserId = req.user?.userId;
        const reviews = await getUserReviewsService(userId, { page, limit, currentUserId });
        res.json(reviews);
    } catch (error) {
        next(error);
    }
};

export const getUserRating = async (req, res, next) => {
    try {
        const userId = parseInt(req.params.userId);
        if (!Number.isInteger(userId)) {
            throw new ValidationError('Invalid user id');
        }
        const rating = await getUserRatingService(userId);
        res.json(rating);
    } catch (error) {
        next(error);
    }
};

export const hasReviewedClass = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const classId = parseInt(req.params.classId);
        if (!Number.isInteger(classId)) {
            throw new ValidationError('Invalid class id');
        }
        const result = await hasReviewedClassService(userId, classId);
        res.json(result);
    } catch (error) {
        next(error);
    }
};
