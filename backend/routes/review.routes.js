import express from 'express';
import { createReview, getClassReviews, getUserReviews, getUserRating, hasReviewedClass } from '../controllers/review.controller.js';
import { validateTokenMiddleware } from '../middlewares/token.middleware.js';

const router = express.Router();

router.use(validateTokenMiddleware);

// Submit a review
router.post('/', createReview);

// Get reviews for a class
router.get('/class/:classId', getClassReviews);

// Check if current user reviewed a class
router.get('/class/:classId/mine', hasReviewedClass);

// Get reviews for a user (public profile)
router.get('/user/:userId', getUserReviews);

// Get aggregate rating for a user
router.get('/user/:userId/rating', getUserRating);

export default router;
