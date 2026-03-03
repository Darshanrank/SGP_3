import {
    createReviewService,
    getClassReviewsService,
    getUserReviewsService,
    getUserRatingService,
    hasReviewedClassService
} from '../services/review.service.js';
import { ValidationError } from '../errors/generic.errors.js';
import { pushNotification } from '../utils/pushNotification.js';
import prisma from '../prisma/client.js';

export const createReview = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const review = await createReviewService(userId, req.body);

        // Create a notification for the reviewee and push it in real-time
        const notification = await prisma.notification.create({
            data: {
                userId: review.revieweeId,
                type: 'SYSTEM',
                message: `${review.reviewer.username} left you a ${review.rating}-star review!`
            }
        });
        const io = req.app.get('io');
        pushNotification(io, review.revieweeId, notification);

        res.status(201).json(review);
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
        const reviews = await getClassReviewsService(classId);
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
        const reviews = await getUserReviewsService(userId, { page, limit });
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
