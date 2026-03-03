// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, ArrowRightLeft, Users, Star, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getDashboardStats, getNotifications } from '../services/meta.service';
import { getMatchedUsers } from '../services/matching.service';
import { createSwapRequest } from '../services/swap.service';
import { Button } from '../components/ui/Button';
import { toast } from 'react-hot-toast';

const Dashboard = () => {
    const { user } = useAuth();
    const [statsData, setStatsData] = useState(null);
    const [matches, setMatches] = useState([]);
    const [recentNotifs, setRecentNotifs] = useState([]);

    useEffect(() => {
        const loadAll = async () => {
            try {
                const [stats, matchData, notifData] = await Promise.all([
                    getDashboardStats(),
                    getMatchedUsers(1, 4),
                    getNotifications()
                ]);
                setStatsData(stats);
                setMatches(matchData?.data || []);
                const notifs = Array.isArray(notifData) ? notifData : notifData?.data || [];
                setRecentNotifs(notifs.slice(0, 5));
            } catch (error) {
                console.error('Failed to load dashboard data', error);
            }
        };

        loadAll();
    }, []);

    const handleQuickSwap = async (targetUserId, skillId) => {
        const message = prompt("Enter a message for your swap request:");
        if (!message) return;
        try {
            await createSwapRequest({ toUserId: targetUserId, learnSkillId: skillId, message });
            toast.success("Swap request sent!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send request");
        }
    };

    const stats = [
        { name: 'Active Swaps', stat: String(statsData?.activeSwaps ?? 0), icon: ArrowRightLeft, color: 'bg-blue-500' },
        { name: 'Skills Teaching', stat: String(statsData?.teaching ?? 0), icon: BookOpen, color: 'bg-green-500' },
        { name: 'Skills Learning', stat: String(statsData?.learning ?? 0), icon: Users, color: 'bg-indigo-500' },
        { name: 'Points', stat: String(statsData?.points ?? 0), icon: Star, color: 'bg-yellow-500' },
    ];

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold leading-tight text-gray-900">Dashboard</h1>
                <p className="mt-1 text-sm text-gray-500">Welcome back, {user?.username}!</p>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((item) => (
                    <div key={item.name} className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden border border-gray-100">
                        <dt>
                            <div className={`absolute rounded-md p-3 ${item.color}`}>
                                <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
                            </div>
                            <p className="ml-16 text-sm font-medium text-gray-500 truncate">{item.name}</p>
                        </dt>
                        <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
                            <p className="text-2xl font-semibold text-gray-900">{item.stat}</p>
                        </dd>
                    </div>
                ))}
            </div>

            {/* Suggested Swaps */}
            {matches.length > 0 && (
                <div className="bg-white shadow rounded-lg p-6 border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-yellow-500" /> Suggested Swaps
                        </h2>
                        <Link to="/skills" className="text-sm text-blue-600 hover:text-blue-500">Browse all</Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {matches.map((m) => (
                            <div key={m.userId} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                                        {(m.username || 'U')[0].toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <Link to={`/users/${m.userId}`} className="font-semibold text-sm text-blue-600 hover:underline truncate block">
                                            {m.username}
                                        </Link>
                                        {m.avgRating > 0 && (
                                            <span className="text-xs text-yellow-600">{m.avgRating} ★ ({m.reviewCount})</span>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1 mb-3">
                                    {m.matchingTeachSkills.slice(0, 2).map(s => (
                                        <span key={s.skillId} className="inline-block text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5 mr-1">
                                            Can teach: {s.skillName}
                                        </span>
                                    ))}
                                    {m.mutualLearnSkills.slice(0, 1).map(s => (
                                        <span key={s.skillId} className="inline-block text-xs bg-purple-100 text-purple-700 rounded-full px-2 py-0.5 mr-1">
                                            Wants: {s.skillName}
                                        </span>
                                    ))}
                                </div>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="w-full"
                                    onClick={() => handleQuickSwap(m.userId, m.matchingTeachSkills[0]?.skillId)}
                                >
                                    Request Swap
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Activity / Quick Actions */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="bg-white shadow rounded-lg p-6 border border-gray-100">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <Link to="/skills/new" className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:text-blue-500 text-gray-500 transition-colors">
                            <span className="font-medium">+ Add Skill</span>
                        </Link>
                        <Link to="/skills" className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:text-green-500 text-gray-500 transition-colors">
                            <span className="font-medium">Find Swap</span>
                        </Link>
                    </div>
                </div>

                <div className="bg-white shadow rounded-lg p-6 border border-gray-100">
                     <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-medium text-gray-900">Recent Notifications</h2>
                        <Link to="/notifications" className="text-sm text-blue-600 hover:text-blue-500">View all</Link>
                     </div>
                     {recentNotifs.length === 0 ? (
                         <div className="text-center text-gray-500 py-8">No new notifications</div>
                     ) : (
                         <ul className="divide-y divide-gray-100">
                             {recentNotifs.map((n) => (
                                 <li key={n.id} className={`py-2 text-sm ${n.isRead ? 'text-gray-500' : 'text-gray-900 font-medium'}`}>
                                     {n.message}
                                     <span className="block text-xs text-gray-400">{new Date(n.createdAt).toLocaleDateString()}</span>
                                 </li>
                             ))}
                         </ul>
                     )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
