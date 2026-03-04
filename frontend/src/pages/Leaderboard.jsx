import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLeaderboard } from '../services/meta.service';
import { Link } from 'react-router-dom';
import { Trophy, Medal, Award } from 'lucide-react';
import { Button } from '../components/ui/Button';

const rankIcon = (rank) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Award className="h-6 w-6 text-amber-600" />;
    return <span className="text-sm font-bold text-gray-500 w-6 text-center">{rank}</span>;
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
            <div className="p-8 space-y-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                ))}
            </div>
        );
    }
    if (error) return <div className="p-8 text-center text-red-500">Failed to load leaderboard</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-16">Rank</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Points</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Swaps</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {leaders.map((entry) => (
                            <tr key={entry.userId} className={`hover:bg-gray-50 transition-colors ${entry.rank <= 3 ? 'bg-yellow-50/40' : ''}`}>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-center">{rankIcon(entry.rank)}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        {entry.avatarUrl ? (
                                            <img
                                                src={`${API_BASE}${entry.avatarUrl}`}
                                                alt=""
                                                className="h-9 w-9 rounded-full object-cover border border-gray-200"
                                            />
                                        ) : (
                                            <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                                                {entry.username?.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <Link to={`/users/${entry.userId}`} className="font-semibold text-blue-600 hover:underline text-sm">
                                                {entry.username}
                                            </Link>
                                            {entry.fullName && <p className="text-xs text-gray-500">{entry.fullName}</p>}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-sm text-green-700">{entry.points}</td>
                                <td className="px-4 py-3 text-right text-sm text-gray-600">{entry.totalSwaps}</td>
                            </tr>
                        ))}
                        {leaders.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">No users on the leaderboard yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-center gap-2">
                <Button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} variant="ghost">Previous</Button>
                <span className="flex items-center text-sm font-medium">
                    Page {page} {meta.totalPages ? `of ${meta.totalPages}` : ''}
                </span>
                <Button disabled={meta.totalPages && page >= meta.totalPages} onClick={() => setPage(p => p + 1)} variant="ghost">Next</Button>
            </div>
        </div>
    );
};

export default Leaderboard;
