import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { createReview, markReviewHelpful } from '../services/classroom.service';
import { REVIEW_CATEGORY_CONFIG, getEmptyCategoryRatings } from '../components/classroom/classroomUtils';

export const useSwapClassroomReviews = (classId) => {
    const [reviewRatings, setReviewRatings] = useState(getEmptyCategoryRatings);
    const [reviewHoverMap, setReviewHoverMap] = useState(getEmptyCategoryRatings);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [myReviewStatus, setMyReviewStatus] = useState({ hasReviewed: false, review: null });
    const [classReviews, setClassReviews] = useState([]);

    // Submit review
    const handleSubmitReview = useCallback(async () => {
        const missingCategory = REVIEW_CATEGORY_CONFIG.find((category) => Number(reviewRatings[category.key] || 0) < 1);
        if (missingCategory) {
            toast.error(`Please rate ${missingCategory.label.toLowerCase()} (1-5 stars)`);
            return;
        }

        setReviewSubmitting(true);
        try {
            const review = await createReview({
                swapClassId: classId,
                clarityRating: reviewRatings.clarityRating,
                punctualityRating: reviewRatings.punctualityRating,
                communicationRating: reviewRatings.communicationRating,
                expertiseRating: reviewRatings.expertiseRating,
                comment: reviewComment || null
            });
            setMyReviewStatus({ hasReviewed: true, review });
            setClassReviews((prev) => [review, ...prev]);
            setReviewRatings(getEmptyCategoryRatings());
            setReviewHoverMap(getEmptyCategoryRatings());
            setReviewComment('');
            toast.success('Review submitted');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to submit review');
        } finally {
            setReviewSubmitting(false);
        }
    }, [classId, reviewRatings, reviewComment]);

    // Mark review as helpful
    const handleHelpfulVote = useCallback(async (reviewId) => {
        try {
            const result = await markReviewHelpful(reviewId);
            setClassReviews((prev) => prev.map((review) => (
                review.id === reviewId
                    ? { ...review, helpfulVotes: result.helpfulVotes, hasHelpfulVote: true }
                    : review
            )));

            if (!result.alreadyVoted) {
                toast.success('Marked as helpful');
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not mark review as helpful');
        }
    }, []);

    return {
        // State
        reviewRatings,
        reviewHoverMap,
        reviewComment,
        reviewSubmitting,
        myReviewStatus,
        classReviews,
        // Setters
        setReviewRatings,
        setReviewHoverMap,
        setReviewComment,
        setReviewSubmitting,
        setMyReviewStatus,
        setClassReviews,
        // Handlers
        handleSubmitReview,
        handleHelpfulVote
    };
};
