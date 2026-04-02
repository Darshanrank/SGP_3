const ProfileReviewsModal = ({ reviewsModalOpen, setReviewsModalOpen, reviewsLoading, reviewItems, renderStarRow }) => {
    if (!reviewsModalOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setReviewsModalOpen(false)}>
            <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#111721] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)]" onClick={(e) => e.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-[#DCE7F5]">Reviews</h4>
                    <button type="button" onClick={() => setReviewsModalOpen(false)} className="rounded-md border border-white/10 px-2 py-1 text-xs text-[#8DA0BF] hover:bg-white/5">
                        Close
                    </button>
                </div>

                {reviewsLoading ? (
                    <p className="text-sm text-[#8DA0BF]">Loading reviews...</p>
                ) : reviewItems.length ? (
                    <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
                        {reviewItems.map((review) => (
                            <div key={review.id} className="rounded-xl border border-white/10 bg-[#0E1620] p-3">
                                <p className="text-sm text-yellow-400">{renderStarRow(review.overallRating)} <span className="ml-1 text-[#8DA0BF]">{Number(review.overallRating || 0).toFixed(1)}</span></p>
                                <p className="mt-2 text-sm text-[#DCE7F5]">{review.comment?.trim() || 'No written feedback.'}</p>
                                <p className="mt-2 text-xs text-[#8DA0BF]">by @{review.reviewer?.username || 'user'}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-[#8DA0BF]">No reviews available yet.</p>
                )}
            </div>
        </div>
    );
};

export default ProfileReviewsModal;
