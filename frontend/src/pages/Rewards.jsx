import { useEffect, useMemo, useState } from 'react';
import { getRewards, getMyBadges, getMyPenalties, getRewardsHistory } from '../services/meta.service';
import { Badge as BadgeIcon, ShieldAlert, Star, Repeat2, Award, Lock, Medal, BookMarked, Handshake, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';

const Rewards = () => {
    const [rewards, setRewards] = useState(null);
    const [badges, setBadges] = useState([]);
    const [penalties, setPenalties] = useState([]);
    const [rewardHistory, setRewardHistory] = useState([]);
    const [achievementMetrics, setAchievementMetrics] = useState({ totalSwaps: 0, positiveReviews: 0, taughtSkills: 0 });
    const [loading, setLoading] = useState(true);

    const reputationLevels = [
        { name: 'Beginner', min: 0, max: 100 },
        { name: 'Learner', min: 100, max: 300 },
        { name: 'Mentor', min: 300, max: 700 },
        { name: 'Expert', min: 700, max: 1200 },
        { name: 'Master', min: 1200, max: null }
    ];

    useEffect(() => {
        const load = async () => {
            try {
                const [r, b, p] = await Promise.all([
                    getRewards(),
                    getMyBadges(),
                    getMyPenalties()
                ]);
                setRewards(r);
                setBadges(Array.isArray(b) ? b : b?.data || b || []);
                setPenalties(Array.isArray(p?.data) ? p.data : p || []);

                try {
                    const historyPayload = await getRewardsHistory(20);
                    setRewardHistory(Array.isArray(historyPayload?.data) ? historyPayload.data : []);
                    setAchievementMetrics({
                        totalSwaps: Number(historyPayload?.metrics?.totalSwaps || r?.totalSwaps || r?.swaps || 0),
                        positiveReviews: Number(historyPayload?.metrics?.positiveReviews || 0),
                        taughtSkills: Number(historyPayload?.metrics?.taughtSkills || 0)
                    });
                } catch (_historyError) {
                    setRewardHistory([]);
                    setAchievementMetrics({
                        totalSwaps: Number(r?.totalSwaps ?? r?.swaps ?? 0),
                        positiveReviews: 0,
                        taughtSkills: 0
                    });
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return <div className="section-card text-center">Loading...</div>;

    const points = Number(rewards?.points || 0);
    const totalSwaps = Number(rewards?.totalSwaps ?? rewards?.swaps ?? 0);
    const unlockedBadgeNames = new Set(
        badges.map((badge) => String(badge?.badge?.name || badge?.name || '').toLowerCase())
    );

    const achievements = [
        {
            key: 'first-swap',
            name: 'First Swap',
            description: 'Complete your first skill swap',
            requirementLabel: '1 swap',
            target: 1,
            progress: achievementMetrics.totalSwaps,
            icon: Handshake
        },
        {
            key: 'top-teacher',
            name: 'Top Teacher',
            description: 'Receive 10 positive reviews',
            requirementLabel: '10 reviews',
            target: 10,
            progress: achievementMetrics.positiveReviews,
            icon: Star
        },
        {
            key: 'knowledge-sharer',
            name: 'Knowledge Sharer',
            description: 'Teach 5 different skills',
            requirementLabel: '5 skills taught',
            target: 5,
            progress: achievementMetrics.taughtSkills,
            icon: BookMarked
        },
        {
            key: 'helpful-mentor',
            name: 'Helpful Mentor',
            description: 'Complete 20 successful swaps',
            requirementLabel: '20 swaps',
            target: 20,
            progress: achievementMetrics.totalSwaps,
            icon: Medal
        }
    ].map((achievement) => {
        const autoUnlocked = achievement.progress >= achievement.target;
        const unlocked = autoUnlocked || unlockedBadgeNames.has(achievement.name.toLowerCase());
        const normalizedProgress = Math.min(achievement.progress, achievement.target);
        const progressPercent = Math.min(100, (normalizedProgress / achievement.target) * 100);

        return {
            ...achievement,
            unlocked,
            normalizedProgress,
            progressPercent
        };
    });

    const currentLevel =
        reputationLevels.find((level) => points >= level.min && (level.max === null || points < level.max)) ||
        reputationLevels[0];
    const currentLevelIndex = reputationLevels.findIndex((level) => level.name === currentLevel.name);
    const nextLevel = reputationLevels[currentLevelIndex + 1] || null;

    const currentLevelCap = currentLevel.max ?? points;
    const progressInLevel = Math.max(0, points - currentLevel.min);
    const levelRange = Math.max(1, currentLevelCap - currentLevel.min);
    const progressPercentage = currentLevel.max === null ? 100 : Math.min(100, (progressInLevel / levelRange) * 100);
    const xpRemaining = nextLevel ? Math.max(0, nextLevel.min - points) : 0;
    const nextRewardTarget = nextLevel?.min ?? currentLevel.min;
    
    const reputationScore = useMemo(() => {
        const positiveReviewScore = Math.min(40, achievementMetrics.positiveReviews * 4);
        const completionScore = Math.min(30, achievementMetrics.totalSwaps * 1.5);
        const attendanceScore = Math.max(0, 20 - penalties.length * 2);
        const penaltyDeduction = Math.min(20, penalties.length * 4);
        const rawScore = positiveReviewScore + completionScore + attendanceScore + 10 - penaltyDeduction;

        return Math.max(0, Math.min(100, Math.round(rawScore)));
    }, [achievementMetrics.positiveReviews, achievementMetrics.totalSwaps, penalties.length]);

    useEffect(() => {
        if (!rewardHistory.length) return;

        const latest = rewardHistory[0];
        if (!latest?.id) return;

        const storageKey = `rewards_last_seen_event_${rewards?.userId || 'me'}`;
        const lastSeen = localStorage.getItem(storageKey);
        if (lastSeen === String(latest.id)) return;

        toast.success(`+${latest.points} XP for ${String(latest.action || 'your activity').toLowerCase()}!`, {
            duration: 3000,
            position: 'top-right'
        });
        localStorage.setItem(storageKey, String(latest.id));
    }, [rewardHistory, rewards?.userId]);

    return (
        <div className="page-shell">
            <h1 className="page-title">Rewards & Reputation</h1>

            <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
                {[
                    {
                        label: 'Points',
                        value: `${points} XP`,
                        detail: `Next reward at ${nextRewardTarget} XP`,
                        icon: Star
                    },
                    {
                        label: 'Total Swaps',
                        value: totalSwaps,
                        detail: 'Completed and active swap activity',
                        icon: Repeat2
                    },
                    {
                        label: 'Badges',
                        value: badges.length,
                        detail: 'Achievements earned so far',
                        icon: Award
                    }
                ].map((item) => {
                    const Icon = item.icon;
                    return (
                        <div key={item.label} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-slate-900 p-5">
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Icon className="h-4 w-4 text-blue-300" />
                                <p>{item.label}</p>
                            </div>
                            <p className="text-2xl font-semibold text-white">{item.value}</p>
                            <p className="text-xs text-gray-500">{item.detail}</p>
                        </div>
                    );
                })}
            </div>

            <section className="mt-6 rounded-xl border border-white/10 bg-slate-900 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-sm text-gray-400">Level</p>
                        <p className="text-xl font-semibold text-white">{currentLevel.name}</p>
                    </div>
                    <p className="text-sm text-gray-400">
                        {currentLevel.max === null
                            ? `${points} XP`
                            : `${points} / ${currentLevel.max} XP`}
                    </p>
                </div>

                <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-700">
                    <div
                        className="h-full rounded-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>

                <div className="mt-4 space-y-1 text-sm text-gray-400">
                    <p>
                        Next Level: <span className="font-medium text-gray-200">{nextLevel?.name || 'Max Level Reached'}</span>
                    </p>
                    <p>
                        {nextLevel
                            ? `${xpRemaining} XP remaining to reach the next level.`
                            : 'You have reached the highest reputation tier.'}
                    </p>
                </div>
            </section>

            <section className="mt-6 rounded-xl border border-white/10 bg-slate-900 p-6">
                <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-green-400" />
                    <h2 className="text-lg font-semibold text-white">Reputation Score</h2>
                </div>
                <p className="mt-2 text-2xl font-semibold text-white">{reputationScore} / 100</p>
                <div className="mt-3 h-2.5 w-full rounded-full bg-slate-700">
                    <div
                        className="h-full rounded-full bg-green-500"
                        style={{ width: `${reputationScore}%` }}
                    />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-400 sm:grid-cols-4">
                    <p>Reviews: +{Math.min(40, achievementMetrics.positiveReviews * 4)}</p>
                    <p>Completion: +{Math.min(30, Math.round(achievementMetrics.totalSwaps * 1.5))}</p>
                    <p>Attendance: +{Math.max(0, 20 - penalties.length * 2)}</p>
                    <p>Penalties: -{Math.min(20, penalties.length * 4)}</p>
                </div>
            </section>

            <section className="section-card">
                <h2 className="section-title mb-4 flex items-center gap-2"><BadgeIcon size={18}/> Achievements</h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {achievements.map((achievement) => {
                        const Icon = achievement.icon;
                        const unlockedClass = achievement.unlocked
                            ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                            : 'bg-slate-800 border border-white/10 text-gray-400 opacity-70';

                        return (
                            <article key={achievement.key} className={`flex flex-col gap-3 rounded-xl p-5 ${unlockedClass}`}>
                                <div className="flex items-center gap-2">
                                    <Icon className="h-5 w-5" />
                                    <p className="text-lg font-semibold text-white">{achievement.name}</p>
                                    {!achievement.unlocked && <Lock className="h-4 w-4" />}
                                </div>
                                <p className="text-sm text-gray-400">{achievement.description}</p>
                                <p className="text-xs text-gray-400">Requirement: {achievement.requirementLabel}</p>
                                <p className="text-sm text-gray-300">Progress: {achievement.normalizedProgress} / {achievement.target}</p>
                                <div className="h-2 w-full rounded-full bg-slate-700">
                                    <div
                                        className="h-full rounded-full bg-blue-500"
                                        style={{ width: `${achievement.progressPercent}%` }}
                                    />
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>

            <section className="mt-6 rounded-xl border border-white/10 bg-slate-900 p-5">
                <h2 className="mb-4 text-lg font-semibold text-white">Rewards History</h2>
                {rewardHistory.length === 0 ? (
                    <div className="py-4">
                        <p className="text-sm text-gray-400">No rewards earned yet.</p>
                        <p className="text-sm text-gray-400">Complete swaps or receive reviews to start earning XP.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-sm text-gray-400">
                                    <th className="pb-3 font-medium">Date</th>
                                    <th className="pb-3 font-medium">Action</th>
                                    <th className="pb-3 text-right font-medium">Points</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rewardHistory.map((entry) => (
                                    <tr key={entry.id} className="border-t border-white/10">
                                        <td className="py-3 text-sm text-gray-300">{new Date(entry.createdAt).toLocaleDateString()}</td>
                                        <td className="py-3 text-sm text-gray-300">{entry.action}</td>
                                        <td className="py-3 text-right text-sm font-medium text-green-400">+{entry.points} XP</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="mt-6 rounded-xl border border-white/10 bg-slate-900 p-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white"><ShieldAlert size={18}/> Penalties</h2>
                {penalties.length === 0 ? (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                        <div className="flex items-center gap-2 text-emerald-300">
                            <ShieldCheck className="h-5 w-5" />
                            <p className="font-semibold">No penalties 🎉</p>
                        </div>
                        <p className="mt-1 text-sm text-emerald-200/90">Keep maintaining good behavior to protect your reputation.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-sm text-gray-400">
                                    <th className="pb-3 font-medium">Date</th>
                                    <th className="pb-3 font-medium">Reason</th>
                                    <th className="pb-3 text-right font-medium">Penalty</th>
                                </tr>
                            </thead>
                            <tbody>
                                {penalties.map((p) => (
                                    <tr key={p.id} className="border-t border-white/10">
                                        <td className="py-3 text-sm text-gray-300">{new Date(p.createdAt).toLocaleDateString()}</td>
                                        <td className="py-3 text-sm text-gray-300">{p.reason}</td>
                                        <td className="py-3 text-right text-sm font-medium text-red-400">{p.penaltyType}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
};

export default Rewards;
