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
import InputDialog from '../components/ui/InputDialog';
import { StatCardSkeleton } from '../components/ui/Skeleton';

const Dashboard = () => {
    const { user } = useAuth();
    const [statsData, setStatsData] = useState(null);
    const [matches, setMatches] = useState([]);
    const [recentNotifs, setRecentNotifs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Input dialog state (replaces prompt())
    const [swapDialog, setSwapDialog] = useState({ open: false, targetUserId: null, skillId: null });

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
            } finally {
                setLoading(false);
            }
        };

        loadAll();
    }, []);

    const handleQuickSwap = (targetUserId, skillId) => {
        setSwapDialog({ open: true, targetUserId, skillId });
    };

    const handleSwapDialogSubmit = async (message) => {
        const { targetUserId, skillId } = swapDialog;
        setSwapDialog({ open: false, targetUserId: null, skillId: null });
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
        <div className="page-shell">
            {/* Input dialog for swap request message */}
            <InputDialog
                open={swapDialog.open}
                title="Send Swap Request"
                placeholder="Enter a message for your swap request..."
                submitLabel="Send Request"
                onSubmit={handleSwapDialogSubmit}
                onCancel={() => setSwapDialog({ open: false, targetUserId: null, skillId: null })}
            />

            <header className="space-y-2">
                <h1 className="page-title">Dashboard</h1>
                <p className="mt-1 text-sm text-[#8DA0BF]">Welcome back, {user?.username}!</p>
            </header>

            {/* Stats Grid */}
            <div className="stats-grid">
                {loading ? (
                    <>
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                    </>
                ) : (
                    stats.map((item) => (
                        <div key={item.name} className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111721] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.55)] transition duration-200 hover:-translate-y-1 hover:bg-[#151D27]">
                            <dt>
                                <div className={`absolute top-5 left-5 rounded-md p-3 ${item.color}`}>
                                    <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
                                </div>
                                <p className="ml-16 truncate text-sm font-medium text-[#8DA0BF]">{item.name}</p>
                            </dt>
                            <dd className="ml-16 mt-2 flex items-baseline">
                                <p className="text-2xl font-semibold text-[#DCE7F5]">{item.stat}</p>
                            </dd>
                        </div>
                    ))
                )}
            </div>

            {/* Suggested Swaps */}
            {matches.length > 0 && (
                <div className="section-card">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="section-title flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-yellow-500" /> Suggested Swaps
                        </h2>
                        <Link to="/skills" className="text-sm text-[#8DA0BF] hover:text-[#0A4D9F]">Browse all</Link>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {matches.map((m) => (
                            <div key={m.userId} className="h-full rounded-2xl border border-white/10 bg-[#0E1620] p-4 transition duration-200 hover:-translate-y-1 hover:bg-[#151D27]">
                                <div className="flex items-center gap-3 mb-2">
                                    {m.avatarUrl ? (
                                        <img src={m.avatarUrl} alt={m.username || 'User'} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-[#0A4D9F]/25 flex items-center justify-center text-[#DCE7F5] font-bold text-sm">
                                            {(m.username || 'U')[0].toUpperCase()}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <Link to={`/u/${m.username}`} className="font-semibold text-sm text-[#DCE7F5] hover:text-[#0A4D9F] truncate block">
                                            {m.username}
                                        </Link>
                                        {m.avgRating > 0 && (
                                            <span className="text-xs text-[#F59E0B]">{m.avgRating} ★ ({m.reviewCount})</span>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1 mb-3">
                                    {m.matchingTeachSkills.slice(0, 2).map((s) => (
                                        <span key={s.skillId} className="mr-1 inline-block rounded-full bg-[#22C55E]/20 px-2 py-0.5 text-xs text-[#22C55E]">
                                            Can teach: {s.skillName}
                                        </span>
                                    ))}
                                    {m.mutualLearnSkills.slice(0, 1).map((s) => (
                                        <span key={s.skillId} className="mr-1 inline-block rounded-full bg-[#0A4D9F]/20 px-2 py-0.5 text-xs text-[#7BB2FF]">
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
                <div className="section-card">
                    <h2 className="section-title mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <Link to="/skills/new" className="flex items-center justify-center p-4 border border-dashed border-white/15 rounded-xl hover:border-[#0A4D9F] hover:text-[#DCE7F5] text-[#8DA0BF] transition-colors">
                            <span className="font-medium">+ Add Skill</span>
                        </Link>
                        <Link to="/skills" className="flex items-center justify-center p-4 border border-dashed border-white/15 rounded-xl hover:border-[#22C55E] hover:text-[#DCE7F5] text-[#8DA0BF] transition-colors">
                            <span className="font-medium">Find Swap</span>
                        </Link>
                    </div>
                </div>

                <div className="section-card">
                     <div className="flex justify-between items-center mb-4">
                    <h2 className="section-title">Recent Notifications</h2>
                        <Link to="/notifications" className="text-sm text-[#8DA0BF] hover:text-[#0A4D9F]">View all</Link>
                     </div>
                     {recentNotifs.length === 0 ? (
                         <div className="py-8 text-center text-[#8DA0BF]">No new notifications</div>
                     ) : (
                         <ul className="divide-y divide-white/5">
                             {recentNotifs.map((n) => (
                                 <li key={n.id} className={`py-2 text-sm ${n.isRead ? 'text-[#8DA0BF]' : 'font-medium text-[#DCE7F5]'}`}>
                                     {n.message}
                                     <span className="block text-xs text-[#6F83A3]">{new Date(n.createdAt).toLocaleDateString()}</span>
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
