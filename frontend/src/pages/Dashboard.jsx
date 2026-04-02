// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, ArrowRightLeft, Users, Star, Sparkles, PlusCircle, MessageCircle, Bell, TrendingUp, CalendarDays } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getDashboardStats, getNotifications, getCalendarEvents } from '../services/meta.service';
import { getMatchedUsers } from '../services/matching.service';
import { createSwapRequest, getMyClasses } from '../services/swap.service';
import { getAllSkills, getUserSkills } from '../services/skill.service';
import { Button } from '../components/ui/Button';
import { toast } from 'react-hot-toast';
import InputDialog from '../components/ui/InputDialog';
import {
    DashboardStatsGrid,
    DashboardNextSessionCard,
    DashboardActiveSwapsSection,
    DashboardSuggestedSwapsSection,
    DashboardOnlineNowSection
} from '../components/dashboard';

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [statsData, setStatsData] = useState(null);
    const [matches, setMatches] = useState([]);
    const [recentNotifs, setRecentNotifs] = useState([]);
    const [classes, setClasses] = useState([]);
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [recommendedSkills, setRecommendedSkills] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Input dialog state (replaces prompt())
    const [swapDialog, setSwapDialog] = useState({ open: false, targetUserId: null, skillId: null });

    useEffect(() => {
        const loadAll = async () => {
            try {
                const [stats, matchData, notifData, classesData, eventsData, mySkillsData, allSkillsData] = await Promise.all([
                    getDashboardStats(),
                    getMatchedUsers(1, 4),
                    getNotifications(),
                    getMyClasses(1, 50),
                    getCalendarEvents(1, 200),
                    getUserSkills(),
                    getAllSkills(1, 200)
                ]);
                setStatsData(stats);
                setMatches(matchData?.data || []);
                const notifs = Array.isArray(notifData) ? notifData : notifData?.data || [];
                setRecentNotifs(notifs.slice(0, 5));
                const classData = Array.isArray(classesData) ? classesData : classesData?.data || [];
                const eventData = Array.isArray(eventsData) ? eventsData : eventsData?.data || [];
                setClasses(Array.isArray(classData) ? classData : []);
                setCalendarEvents(Array.isArray(eventData) ? eventData : []);

                const mySkills = Array.isArray(mySkillsData) ? mySkillsData : mySkillsData?.data || [];
                const allSkills = Array.isArray(allSkillsData) ? allSkillsData : allSkillsData?.data || [];
                const mySkillNames = new Set(mySkills.map((item) => String(item?.skill?.name || item?.name || '').toLowerCase()).filter(Boolean));
                const skillFrequency = new Map();

                allSkills.forEach((skill) => {
                    const name = String(skill?.name || '').trim();
                    if (!name || mySkillNames.has(name.toLowerCase())) return;
                    skillFrequency.set(name, (skillFrequency.get(name) || 0) + 1);
                });

                const recommendations = [...skillFrequency.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8)
                    .map(([name]) => name);

                setRecommendedSkills(recommendations.length ? recommendations : ['React', 'Docker', 'System Design', 'Machine Learning', 'UI/UX Design']);

                const partnerMap = new Map();
                (classData || []).forEach((cls) => {
                    const from = cls?.swapRequest?.fromUser;
                    const to = cls?.swapRequest?.toUser;
                    const partner = from?.userId === user?.userId ? to : from;
                    if (!partner?.userId || partnerMap.has(partner.userId)) return;
                    partnerMap.set(partner.userId, {
                        userId: partner.userId,
                        username: partner.username,
                        avatarUrl: partner?.profile?.avatarUrl || null
                    });
                });
                setOnlineUsers([...partnerMap.values()].slice(0, 6));
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
        { name: 'Skills Teaching', stat: String(statsData?.teaching ?? 0), icon: BookOpen, color: 'bg-green-500/20' },
        { name: 'Skills Learning', stat: String(statsData?.learning ?? 0), icon: Users, color: 'bg-indigo-500' },
        { name: 'Points', stat: String(statsData?.points ?? 0), icon: Star, color: 'bg-yellow-500' },
    ];

    const nextSession = useMemo(() => {
        const now = new Date();
        const classMap = new Map((classes || []).map((cls) => [cls.id, cls]));

        const upcoming = (calendarEvents || [])
            .filter((event) => event?.swapClassId && event?.eventDate)
            .map((event) => ({
                event,
                classInfo: classMap.get(event.swapClassId),
                eventDate: new Date(event.eventDate)
            }))
            .filter((item) => item.classInfo && item.eventDate && !Number.isNaN(item.eventDate.getTime()) && item.eventDate >= now)
            .sort((a, b) => a.eventDate - b.eventDate);

        return upcoming[0] || null;
    }, [calendarEvents, classes]);

    const nextSessionByClassId = useMemo(() => {
        const now = new Date();
        const mapped = {};

        (calendarEvents || []).forEach((event) => {
            const classId = event?.swapClassId;
            if (!classId || !event?.eventDate) return;

            const eventDate = new Date(event.eventDate);
            if (Number.isNaN(eventDate.getTime()) || eventDate < now) return;

            if (!mapped[classId] || eventDate < mapped[classId]) {
                mapped[classId] = eventDate;
            }
        });

        return mapped;
    }, [calendarEvents]);

    const activeSwaps = useMemo(
        () => (classes || []).filter((cls) => cls.status === 'ONGOING'),
        [classes]
    );

    const quickActions = [
        { title: 'Add Skill', icon: PlusCircle, to: '/skills/new' },
        { title: 'Find Swap', icon: Sparkles, to: '/discover' },
        { title: 'Open Chat', icon: MessageCircle, to: '/swaps' },
        { title: 'View Calendar', icon: CalendarDays, to: '/calendar' },
        { title: 'My Classes', icon: ArrowRightLeft, to: '/swaps' }
    ];

    const getNotificationIcon = (notification) => {
        const type = String(notification?.type || '').toUpperCase();
        const message = String(notification?.message || '').toLowerCase();

        if (type.includes('SWAP') || message.includes('swap')) return ArrowRightLeft;
        if (type.includes('MESSAGE') || message.includes('message') || message.includes('chat')) return MessageCircle;
        if (type.includes('REVIEW') || message.includes('review')) return Star;
        return Bell;
    };

    const learningProgress = useMemo(() => {
        const learning = Number(statsData?.learning ?? 0);
        const active = Number(statsData?.activeSwaps ?? 0);
        const points = Number(statsData?.points ?? 0);
        const completion = Math.min(100, learning > 0 ? Math.round((active / learning) * 100) : 0);
        return {
            completion,
            learning,
            active,
            points
        };
    }, [statsData]);

    const formatSessionTime = (date) => {
        if (!date) return 'No upcoming session';
        return date.toLocaleString('en-US', {
            weekday: 'short',
            hour: 'numeric',
            minute: '2-digit'
        }).replace(',', ' •');
    };

    return (
        <div className="page-shell space-y-6">
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

            <DashboardStatsGrid loading={loading} stats={stats} />

            <DashboardNextSessionCard
                nextSession={nextSession}
                user={user}
                formatSessionTime={formatSessionTime}
                onGoToClassroom={(swapClassId) => navigate(`/swaps/${swapClassId}`)}
                onGoToSwaps={() => navigate('/swaps')}
            />

            <DashboardActiveSwapsSection
                activeSwaps={activeSwaps}
                nextSessionByClassId={nextSessionByClassId}
                formatSessionTime={formatSessionTime}
                onGoToClassroom={(swapClassId) => navigate(`/swaps/${swapClassId}`)}
            />

            <DashboardSuggestedSwapsSection matches={matches} onQuickSwap={handleQuickSwap} />

            <div className="section-card">
                <h2 className="section-title mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    {quickActions.map((action) => (
                        <Link
                            key={action.title}
                            to={action.to}
                            className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0F172A] p-4 text-[#DCE7F5] transition hover:bg-[#111827]"
                        >
                            <action.icon className="h-4 w-4 text-[#8DA0BF]" />
                            <span className="text-sm font-medium">{action.title}</span>
                        </Link>
                    ))}
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
                    <ul className="space-y-1">
                        {recentNotifs.map((n) => {
                            const Icon = getNotificationIcon(n);
                            return (
                                <li key={n.id} className="flex items-start gap-3 rounded-md p-2 transition hover:bg-white/5">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
                                        <Icon className="h-4 w-4" />
                                    </span>
                                    <div className="min-w-0">
                                        <p className={`text-sm ${n.isRead ? 'text-[#C4D4EC]' : 'text-white'}`}>{n.message}</p>
                                        <p className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <div className="section-card bg-[#0F172A] border border-white/10 rounded-xl p-5">
                <h2 className="section-title mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-blue-400" /> Learning Progress</h2>
                <div className="space-y-3">
                    <div className="h-2 w-full rounded-full bg-white/10">
                        <div className="h-2 rounded-full bg-blue-500" style={{ width: `${learningProgress.completion}%` }} />
                    </div>
                    <p className="text-sm text-gray-400">{learningProgress.completion}% of current learning goals are active</p>
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                            <p className="text-lg font-semibold text-white">{learningProgress.learning}</p>
                            <p className="text-xs text-gray-400">Learning</p>
                        </div>
                        <div>
                            <p className="text-lg font-semibold text-white">{learningProgress.active}</p>
                            <p className="text-xs text-gray-400">Active</p>
                        </div>
                        <div>
                            <p className="text-lg font-semibold text-white">{learningProgress.points}</p>
                            <p className="text-xs text-gray-400">Points</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="section-card bg-[#0F172A] border border-white/10 rounded-xl p-5">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="section-title">Recommended Skills</h2>
                    <Button
                        size="sm"
                        className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
                        onClick={() => navigate('/discover')}
                    >
                        Explore Skills
                    </Button>
                </div>
                <div className="flex flex-wrap gap-3">
                    {recommendedSkills.map((skill) => (
                        <button
                            key={skill}
                            type="button"
                            onClick={() => navigate('/discover')}
                            className="cursor-pointer rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-sm text-blue-400 transition hover:bg-blue-500/20"
                        >
                            {skill}
                        </button>
                    ))}
                </div>
            </div>

            <DashboardOnlineNowSection onlineUsers={onlineUsers} />
        </div>
    );
};

export default Dashboard;
