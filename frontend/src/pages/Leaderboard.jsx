import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLeaderboard } from '../services/meta.service';
import { Link } from 'react-router-dom';
import { Trophy, Medal, Award } from 'lucide-react';
import { Button } from '../components/ui/Button';

const rankIcon = (rank) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-[#9AA9C2]" />;
    if (rank === 3) return <Award className="h-6 w-6 text-amber-600" />;
    return <span className="w-6 text-center text-sm font-bold text-[#8DA0BF]">{rank}</span>;
};

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

const Leaderboard = () => {
    const [page, setPage] = useState(1);

    const { data, isLoading, error } = useQuery({
        queryKey: ['leaderboard', page],
        queryFn: () => getLeaderboard(page, 20),
        keepPreviousData: true,
        staleTime: 60000,
    });

    const leaders = data?.data || [];
    const meta = data?.meta || {};

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

            <div className="section-card p-0! overflow-hidden">
                <table className="w-full">
                    <thead className="bg-[#0E1620] border-b border-white/10">
                        <tr>
                            <th className="w-16 px-4 py-3 text-left text-xs font-semibold uppercase text-[#8DA0BF]">Rank</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8DA0BF]">User</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-[#8DA0BF]">Points</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-[#8DA0BF]">Swaps</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {leaders.map((entry) => (
                            <tr
                                key={entry.userId}
                                className={`transition-colors hover:bg-[#151D27] ${
                                    entry.rank === 1
                                        ? 'bg-[#0A4D9F]/14'
                                        : entry.rank === 2
                                            ? 'bg-green-500/10'
                                            : entry.rank === 3
                                                ? 'bg-[#7BB2FF]/10'
                                                : ''
                                }`}
                            >
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-center">{rankIcon(entry.rank)}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
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
                                            <Link to={`/u/${entry.username}`} className="text-sm font-semibold text-[#DCE7F5] hover:text-[#0A4D9F]">
                                                {entry.username}
                                            </Link>
                                            {entry.fullName && <p className="text-xs text-[#8DA0BF]">{entry.fullName}</p>}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right text-sm font-bold text-green-400">{entry.points}</td>
                                <td className="px-4 py-3 text-right text-sm text-[#8DA0BF]">{entry.totalSwaps}</td>
                            </tr>
                        ))}
                        {leaders.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-[#8DA0BF]">No users on the leaderboard yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

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
