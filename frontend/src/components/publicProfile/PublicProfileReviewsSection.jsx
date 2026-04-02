import { Star } from 'lucide-react';

const PublicProfileReviewsSection = ({ rating, detailedReviews }) => {
    return (
        <div className="rounded-xl border border-white/10 bg-[#111721] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
            <h2 className="mb-4 text-lg font-bold text-[#DCE7F5]">Reviews</h2>
            <div className="mb-4 rounded-lg border border-white/10 bg-[#0E1620] px-4 py-3">
                <p className="text-sm font-semibold text-[#DCE7F5]">⭐ {Number(rating.avgRating || 0).toFixed(1)} average rating</p>
                <p className="text-xs text-[#8DA0BF]">{rating.reviewCount || 0} total review{(rating.reviewCount || 0) === 1 ? '' : 's'}</p>
            </div>

            {detailedReviews.length > 0 ? (
                <div className="space-y-4">
                    {detailedReviews.map((review) => (
                        <div key={review.id} className="rounded-lg border border-white/10 bg-[#0E1620] p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-[#DCE7F5]">{review.reviewerName}</p>
                                    <p className="text-xs text-[#8DA0BF]">{review.reviewDate}</p>
                                </div>
                                <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <Star key={s} className={`h-4 w-4 ${s <= review.ratingValue ? 'fill-yellow-400 text-yellow-400' : 'text-[#3E4D63]'}`} />
                                    ))}
                                </div>
                            </div>

                            <div className="mt-3 space-y-1 text-sm text-[#8DA0BF]">
                                <p><span className="font-medium text-[#DCE7F5]">Learned:</span> {review.skillLearned}</p>
                                <p><span className="font-medium text-[#DCE7F5]">Session:</span> {review.sessionType}</p>
                            </div>

                            <p className="mt-3 text-sm italic text-[#8DA0BF]">{review.commentText ? `"${review.commentText}"` : 'No comment provided.'}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-[#8DA0BF]">No reviews yet.</p>
            )}
        </div>
    );
};

export default PublicProfileReviewsSection;
