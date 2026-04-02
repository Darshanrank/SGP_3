import { Star, Trophy, Award, Zap, ArrowRightLeft } from 'lucide-react';

const PublicProfileStatsSection = ({
    reward,
    badges,
    rating,
    trustIndicators,
    totalSwaps,
    profileCompletionPercent,
    profileCompletion
}) => {
    return (
        <>
            <div className="rounded-xl border border-white/10 bg-[#111721] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#DCE7F5]">
                    <Trophy className="h-5 w-5 text-[#F59E0B]" /> Rankings & Stats
                </h2>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="rounded-lg border border-white/10 bg-[#0E1620] p-4 text-center shadow-[0_8px_20px_rgba(0,0,0,0.35)]">
                        <Zap className="mx-auto mb-1 h-6 w-6 text-[#F59E0B]" />
                        <p className="text-2xl font-bold text-[#F7FBFF]">{reward.points}</p>
                        <p className="text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">Points</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-[#0E1620] p-4 text-center shadow-[0_8px_20px_rgba(0,0,0,0.35)]">
                        <ArrowRightLeft className="mx-auto mb-1 h-6 w-6 text-[#3B82F6]" />
                        <p className="text-2xl font-bold text-[#F7FBFF]">{reward.totalSwaps}</p>
                        <p className="text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">Total Swaps</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-[#0E1620] p-4 text-center shadow-[0_8px_20px_rgba(0,0,0,0.35)]">
                        <Star className="mx-auto mb-1 h-6 w-6 fill-[#FACC15] text-[#FACC15]" />
                        <p className="text-2xl font-bold text-[#F7FBFF]">{rating.reviewCount > 0 ? Number(rating.avgRating).toFixed(1) : '-'}</p>
                        <p className="text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">Avg Rating</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-[#0E1620] p-4 text-center shadow-[0_8px_20px_rgba(0,0,0,0.35)]">
                        <Award className="mx-auto mb-1 h-6 w-6 text-[#A855F7]" />
                        <p className="text-2xl font-bold text-[#F7FBFF]">{badges.length}</p>
                        <p className="text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">Badges</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-[#111721] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
                    <h2 className="mb-3 text-lg font-bold text-[#DCE7F5]">Trust Indicators</h2>
                    <div className="space-y-2 text-sm text-[#DCE7F5]">
                        {trustIndicators.verifiedEmail ? (
                            <div className="flex items-center gap-2 text-green-400">
                                <span>✔</span>
                                <span>Verified Email</span>
                            </div>
                        ) : null}
                        <div className="flex items-center gap-2">
                            <span className="text-green-400">✔</span>
                            <span>Completed {Number(trustIndicators.completedSwaps || totalSwaps || 0)} swaps</span>
                        </div>
                        {Number(trustIndicators.penaltyCount || 0) === 0 ? (
                            <div className="flex items-center gap-2 text-green-400">
                                <span>✔</span>
                                <span>No penalties</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-yellow-400">
                                <span>!</span>
                                <span>{Number(trustIndicators.penaltyCount || 0)} penalty records</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#111721] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
                    <h2 className="mb-3 text-lg font-bold text-[#DCE7F5]">Profile Strength</h2>
                    <div className="mb-2 text-sm text-[#8DA0BF]">{profileCompletionPercent}% Complete</div>
                    <div className="h-2 w-full rounded-full bg-[#243244]">
                        <div className="h-2 rounded-full bg-blue-500" style={{ width: `${profileCompletionPercent}%` }} />
                    </div>
                    {profileCompletion?.suggestion ? (
                        <p className="mt-3 text-xs text-[#8DA0BF]">{profileCompletion.suggestion}</p>
                    ) : null}
                </div>
            </div>
        </>
    );
};

export default PublicProfileStatsSection;
