import { Star, ThumbsUp } from 'lucide-react';
import { Button } from '../ui/Button';

const ClassroomReviewsPanel = ({
    myReviewStatus,
    REVIEW_CATEGORY_CONFIG,
    reviewRatings,
    setReviewRatings,
    reviewHoverMap,
    setReviewHoverMap,
    draftOverallRating,
    reviewComment,
    setReviewComment,
    handleSubmitReview,
    reviewSubmitting,
    classReviews,
    mostHelpfulReview,
    handleHelpfulVote
}) => (
    <>
        {!myReviewStatus.hasReviewed ? (
            <div className="mb-6 rounded-lg border border-[#4A3913] bg-[#2B220F] p-4">
                <p className="mb-4 text-sm font-medium text-[#FCD34D]">
                    Rate your experience across all categories.
                </p>

                <div className="space-y-3">
                    {REVIEW_CATEGORY_CONFIG.map((category) => {
                        const selected = Number(reviewRatings[category.key] || 0);
                        const hovered = Number(reviewHoverMap[category.key] || 0);
                        const current = hovered || selected;

                        return (
                            <div key={category.key} className="rounded-lg border border-white/10 bg-[#111721] px-3 py-2">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm text-[#E6EEF8]">{category.label}</span>
                                    <div className="flex items-center gap-0.5">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={`${category.key}_${star}`}
                                                type="button"
                                                onClick={() => setReviewRatings((prev) => ({ ...prev, [category.key]: star }))}
                                                onMouseEnter={() => setReviewHoverMap((prev) => ({ ...prev, [category.key]: star }))}
                                                onMouseLeave={() => setReviewHoverMap((prev) => ({ ...prev, [category.key]: 0 }))}
                                                className="focus:outline-none"
                                            >
                                                <Star
                                                    className={`h-6 w-6 transition-colors ${
                                                        star <= current ? 'fill-yellow-400 text-yellow-400' : 'text-gray-500'
                                                    }`}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <p className="mt-3 text-xs text-[#DCE7F5]">
                    Overall rating: {draftOverallRating > 0 ? `${draftOverallRating}/5` : 'rate all categories'}
                </p>

                <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Write your feedback (optional)..."
                    className="mb-3 mt-3 w-full rounded-md border border-white/10 bg-[#111721] px-3 py-2 text-sm text-[#E6EEF8] placeholder:text-[#6F83A3] focus:outline-none"
                    rows={3}
                />
                <Button
                    size="sm"
                    onClick={handleSubmitReview}
                    disabled={reviewSubmitting || draftOverallRating === 0}
                >
                    {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                </Button>
            </div>
        ) : (
            <div className="mb-4 rounded-lg border border-[#1C3E2A] bg-[#0E2319] p-3 text-sm text-[#86EFAC]">
                You've already reviewed this class ({myReviewStatus.review?.overallRating}/5 stars).
            </div>
        )}

        {classReviews.length > 0 ? (
            <div className="space-y-3">
                {mostHelpfulReview && (
                    <div className="rounded-xl border border-white/10 bg-[#111721] p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#FCD34D]">Most Helpful Review</p>
                        {mostHelpfulReview.comment ? (
                            <p className="mt-2 text-sm text-[#DCE7F5]">"{mostHelpfulReview.comment}"</p>
                        ) : (
                            <p className="mt-2 text-sm text-[#8DA0BF]">No written feedback.</p>
                        )}
                        <p className="mt-2 text-xs text-[#8DA0BF]">Helpful votes: {mostHelpfulReview.helpfulVotes || 0}</p>
                    </div>
                )}

                {classReviews.map((review) => (
                    <div key={review.id} className="bg-[#111721] border border-white/10 rounded-xl p-4 shadow-md transition duration-200 hover:border-blue-500 hover:shadow-lg">
                        <div className="mb-1 flex items-center justify-between">
                            <span className="text-sm font-semibold text-[#E6EEF8]">
                                {review.reviewer?.username}
                            </span>
                            <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((score) => (
                                    <Star
                                        key={score}
                                        className={`h-4 w-4 ${score <= review.overallRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[#8DA0BF]">
                            <span>Clarity: {review.clarityRating}/5</span>
                            <span>Punctuality: {review.punctualityRating}/5</span>
                            <span>Communication: {review.communicationRating}/5</span>
                            <span>Expertise: {review.expertiseRating}/5</span>
                        </div>

                        {review.comment && <p className="text-sm text-[#C4D4EC]">{review.comment}</p>}

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            {review.verifiedSwap && (
                                <span className="bg-green-500/10 text-green-400 px-2 py-1 rounded-full text-xs">Verified Swap</span>
                            )}
                            {review.recentReview && (
                                <span className="bg-[#0A4D9F]/30 text-[#9FC8FF] px-2 py-1 rounded-full text-xs">Recent Session</span>
                            )}
                            {review.completedClass && (
                                <span className="bg-[#7C3AED]/30 text-[#C4B5FD] px-2 py-1 rounded-full text-xs">Completed Class</span>
                            )}
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                            <p className="text-xs text-[#8DA0BF]">{new Date(review.createdAt).toLocaleDateString()}</p>
                            <button
                                type="button"
                                onClick={() => handleHelpfulVote(review.id)}
                                disabled={Boolean(review.hasHelpfulVote)}
                                className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs ${review.hasHelpfulVote ? 'bg-[#1A2430] text-[#8DA0BF]' : 'bg-[#0A4D9F] text-white hover:bg-[#083A78]'}`}
                            >
                                <ThumbsUp className="h-3.5 w-3.5" />
                                Helpful ({review.helpfulVotes || 0})
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <p className="text-sm text-[#8DA0BF]">No reviews yet.</p>
        )}
    </>
);

export default ClassroomReviewsPanel;
