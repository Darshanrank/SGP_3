import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLeaderboard } from '../services/meta.service';
import { Link } from 'react-router-dom';
import { Star, Trophy } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

const rankBadge = (rank) => {
    if (rank === 1) return <span className="text-2xl text-yellow-400">🥇</span>;
    if (rank === 2) return <span className="text-2xl text-gray-300">🥈</span>;
    if (rank === 3) return <span className="text-2xl text-orange-400">🥉</span>;
    return <span className="w-6 text-center text-sm font-bold text-[#8DA0BF]">{rank}</span>;
};

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

const REPUTATION_LEVELS = [
    { name: 'Beginner', min: 0, max: 100 },
    { name: 'Learner', min: 100, max: 300 },
    { name: 'Mentor', min: 300, max: 700 },
    { name: 'Expert', min: 700, max: 1200 },
    { name: 'Master', min: 1200, max: null }
];

const getLevelInfo = (points = 0) => {
    const normalizedPoints = Number(points || 0);
    const currentLevel =
        REPUTATION_LEVELS.find((level) => normalizedPoints >= level.min && (level.max === null || normalizedPoints < level.max)) ||
        REPUTATION_LEVELS[0];
    const currentLevelIndex = REPUTATION_LEVELS.findIndex((level) => level.name === currentLevel.name);
    const nextLevel = REPUTATION_LEVELS[currentLevelIndex + 1] || null;

    return { currentLevel, nextLevel };
};

const getProgress = (points = 0) => {
    const normalizedPoints = Number(points || 0);
    const { currentLevel, nextLevel } = getLevelInfo(normalizedPoints);
    if (!nextLevel) return 100;

    const range = Math.max(1, nextLevel.min - currentLevel.min);
    const progressInLevel = Math.max(0, normalizedPoints - currentLevel.min);
    return Math.min(100, Math.round((progressInLevel / range) * 100));
};

const levelBadgeClass = (level) => {
    if (level === 'Beginner') return 'bg-gray-500/10 text-gray-400';
    if (level === 'Learner') return 'bg-blue-500/10 text-blue-400';
    if (level === 'Mentor') return 'bg-green-500/10 text-green-400';
    if (level === 'Expert') return 'bg-purple-500/10 text-purple-400';
    return 'bg-yellow-500/10 text-yellow-400';
};

const Leaderboard = () => {
    const [page, setPage] = useState(1);
    const { user } = useAuth();

    const { data, isLoading, error } = useQuery({
        queryKey: ['leaderboard', page],
        queryFn: () => getLeaderboard(page, 20),
        keepPreviousData: true,
        staleTime: 60000,
    });

    const leaders = data?.data || [];
    const meta = data?.meta || {};
    const topThree = page === 1 ? leaders.slice(0, 3) : [];
    const stats = {
        participants: Number(meta.total ?? leaders.length ?? 0),
        totalXp: leaders.reduce((sum, entry) => sum + Number(entry.points || 0), 0),
        topLearners: leaders.filter((entry) => Number(entry.points || 0) >= 100).length
    };

    if (isLoading && page === 1) {
        return (
            <div className="section-card space-y-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 rounded-lg bg-[#0E1620] animate-pulse" />
                ))}
            </div>
        );
    }
    if (error) return <div className="section-card text-center text-red-400">Failed to load leaderboard</div>;

    return (
        <div className="page-shell">
            <h1 className="page-title">Leaderboard</h1>

            <section className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
                <article className="rounded-xl border border-white/10 bg-slate-900 p-6 text-center">
                    <p className="text-sm text-gray-400">Participants</p>
                    <p className="mt-1 text-2xl font-semibold text-white">{stats.participants}</p>
                </article>
                <article className="rounded-xl border border-white/10 bg-slate-900 p-6 text-center">
                    <p className="text-sm text-gray-400">Total XP</p>
                    <p className="mt-1 text-2xl font-semibold text-white">{stats.totalXp}</p>
                </article>
                <article className="rounded-xl border border-white/10 bg-slate-900 p-6 text-center">
                    <p className="text-sm text-gray-400">Top Learners</p>
                    <p className="mt-1 text-2xl font-semibold text-white">{stats.topLearners}</p>
                </article>
            </section>

            {leaders.length === 0 && (
                <section className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
                    <Trophy className="h-10 w-10 text-yellow-400" />
                    <p className="mt-4 text-lg font-semibold text-gray-200">No leaderboard data yet.</p>
                    <p className="mt-1 text-sm">Complete swaps to earn points and appear here.</p>
                </section>
            )}

            {leaders.length > 0 && topThree.length > 0 && (
                <section className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
                    {topThree.map((entry) => {
                        const points = Number(entry.points || 0);
                        const { currentLevel, nextLevel } = getLevelInfo(points);
                        const progress = getProgress(points);
                        const isCurrentUser = Number(entry.userId) === Number(user?.userId)
                            || String(entry.username || '').toLowerCase() === String(user?.username || '').toLowerCase();

                        return (
                            <article
                                key={`top-${entry.userId}`}
                                className={`flex flex-col items-center gap-2 rounded-xl border p-6 text-center ${isCurrentUser ? 'border-green-400/20 bg-green-500/10' : 'border-white/10 bg-slate-900'}`}
                            >
                                {rankBadge(entry.rank)}
                                {entry.avatarUrl ? (
                                    <img
                                        src={entry.avatarUrl.startsWith('http') ? entry.avatarUrl : `${API_BASE}${entry.avatarUrl}`}
                                        alt={entry.username}
                                        className="h-12 w-12 rounded-full border border-white/10 object-cover"
                                    />
                                ) : (
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-[#0A4D9F]/25 text-sm font-semibold text-[#DCE7F5]">
                                        {entry.username?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="group relative flex items-center gap-2">
                                    <Link to={`/u/${entry.username}`} className="text-base font-semibold text-[#DCE7F5] hover:text-[#0A4D9F]">
                                        {entry.username}
                                    </Link>
                                    {isCurrentUser && <span className="ml-1 rounded-md bg-green-500/20 px-2 py-0.5 text-xs text-green-400">You</span>}
                                    <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-3 w-48 -translate-x-1/2 rounded-xl border border-white/10 bg-slate-900 p-4 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                                        <p className="text-sm font-semibold text-white">{entry.username}</p>
                                        <p className="mt-1 text-xs text-gray-300">⭐ {entry.avgRating ? Number(entry.avgRating).toFixed(1) : 'N/A'} Rating</p>
                                        <p className="mt-1 text-xs text-gray-300">Teaches: {Array.isArray(entry.teaches) && entry.teaches.length > 0 ? entry.teaches.slice(0, 2).join(', ') : 'Not shared yet'}</p>
                                        <p className="mt-1 text-xs text-gray-300">Swaps: {Number(entry.totalSwaps || 0)}</p>
                                    </div>
                                </div>
                                <p className="flex items-center gap-1 text-sm font-medium text-[#9FC8FF]">
                                    <Star className="h-4 w-4" />
                                    {entry.points} XP
                                </p>
                                <div className="w-full">
                                    <div className="w-full h-1.5 bg-slate-700 rounded-full mt-1">
                                        <div className="bg-blue-500 h-full rounded-full" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <p className="mt-1 text-xs text-gray-400">
                                        {nextLevel ? `${progress}% to ${nextLevel.name}` : `${currentLevel.name} (max level)`}
                                    </p>
                                </div>
                            </article>
                        );
                    })}
                </section>
            )}

            {leaders.length > 0 && (
            <div className="section-card p-0! overflow-hidden">
                <table className="w-full">
                    <thead className="bg-[#0E1620] border-b border-white/10">
                        <tr>
                            <th className="w-16 px-4 py-3 text-left text-xs font-semibold uppercase text-[#8DA0BF]">Rank</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8DA0BF]">User</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8DA0BF]">Level</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-[#8DA0BF]">Points</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-[#8DA0BF]">Swaps</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {leaders.map((entry) => {
                            const isCurrentUser = Number(entry.userId) === Number(user?.userId)
                                || String(entry.username || '').toLowerCase() === String(user?.username || '').toLowerCase();
                            const points = Number(entry.points || 0);
                            const { currentLevel, nextLevel } = getLevelInfo(points);
                            const progress = getProgress(points);
                            const level = currentLevel.name;

                            return (
                                <tr
                                    key={entry.userId}
                                    className={`transition-colors ${
                                        isCurrentUser
                                            ? 'bg-green-500/10 hover:bg-green-500/15'
                                            : entry.rank === 1
                                                ? 'bg-[#0A4D9F]/14 hover:bg-[#151D27]'
                                                : entry.rank === 2
                                                    ? 'bg-green-500/10 hover:bg-[#151D27]'
                                                    : entry.rank === 3
                                                        ? 'bg-[#7BB2FF]/10 hover:bg-[#151D27]'
                                                        : 'hover:bg-[#151D27]'
                                    }`}
                                >
                                    <td className={`px-4 py-3 ${isCurrentUser ? 'border-y border-green-400/20 first:border-l first:rounded-l-lg' : ''}`}>
                                        <div className="flex items-center justify-center">{rankBadge(entry.rank)}</div>
                                    </td>
                                    <td className={`px-4 py-3 ${isCurrentUser ? 'border-y border-green-400/20' : ''}`}>
                                        <div className="group relative flex items-center gap-3">
                                            {entry.avatarUrl ? (
                                                <img
                                                    src={entry.avatarUrl.startsWith('http') ? entry.avatarUrl : `${API_BASE}${entry.avatarUrl}`}
                                                    alt=""
                                                    className="h-9 w-9 rounded-full object-cover border border-white/10"
                                                />
                                            ) : (
                                                <div className="h-9 w-9 rounded-full bg-[#0A4D9F]/25 flex items-center justify-center text-[#DCE7F5] font-bold text-sm">
                                                    {entry.username?.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <div className="flex items-center">
                                                    <Link to={`/u/${entry.username}`} className="text-sm font-semibold text-[#DCE7F5] hover:text-[#0A4D9F]">
                                                        {entry.username}
                                                    </Link>
                                                    {isCurrentUser && (
                                                        <span className="ml-2 rounded-md bg-green-500/20 px-2 py-0.5 text-xs text-green-400">You</span>
                                                    )}
                                                </div>
                                                {entry.fullName && <p className="text-xs text-[#8DA0BF]">{entry.fullName}</p>}
                                            </div>
                                            <div className="pointer-events-none absolute left-0 top-full z-50 mt-3 w-48 rounded-xl border border-white/10 bg-slate-900 p-4 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                                                <p className="text-sm font-semibold text-white">{entry.username}</p>
                                                <p className="mt-1 text-xs text-gray-300">⭐ {entry.avgRating ? Number(entry.avgRating).toFixed(1) : 'N/A'} Rating</p>
                                                <p className="mt-1 text-xs text-gray-300">Teaches: {Array.isArray(entry.teaches) && entry.teaches.length > 0 ? entry.teaches.slice(0, 2).join(', ') : 'Not shared yet'}</p>
                                                <p className="mt-1 text-xs text-gray-300">Swaps: {Number(entry.totalSwaps || 0)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className={`px-4 py-3 ${isCurrentUser ? 'border-y border-green-400/20' : ''}`}>
                                        <span className={`rounded-md px-2 py-1 text-xs ${levelBadgeClass(level)}`}>
                                            {level}
                                        </span>
                                    </td>
                                    <td className={`px-4 py-3 text-right text-sm font-bold text-green-400 ${isCurrentUser ? 'border-y border-green-400/20' : ''}`}>
                                        <div className="ml-auto w-36">
                                            <span className="inline-flex items-center justify-end gap-1">
                                                <Star className="h-3.5 w-3.5" />
                                                {entry.points} XP
                                            </span>
                                            <div className="w-full h-1.5 bg-slate-700 rounded-full mt-1">
                                                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${progress}%` }}></div>
                                            </div>
                                            <p className="mt-1 text-[11px] text-[#8DA0BF]">
                                                {nextLevel ? `${progress}% to ${nextLevel.name}` : 'Max level'}
                                            </p>
                                        </div>
                                    </td>
                                    <td className={`px-4 py-3 text-right text-sm text-[#8DA0BF] ${isCurrentUser ? 'border-y border-r border-green-400/20 last:rounded-r-lg' : ''}`}>{entry.totalSwaps}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            )}

            {/* Pagination */}
            <div className="flex justify-center gap-2">
                <Button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} variant="ghost">Previous</Button>
                <span className="flex items-center text-sm font-medium text-[#8DA0BF]">
                    Page {page} {meta.totalPages ? `of ${meta.totalPages}` : ''}
                </span>
                <Button disabled={meta.totalPages && page >= meta.totalPages} onClick={() => setPage(p => p + 1)} variant="ghost">Next</Button>
            </div>
        </div>
    );
};

export default Leaderboard;
