// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, ArrowRightLeft, Users, Star, Sparkles, Repeat2, CalendarDays, Clock, PlusCircle, MessageCircle, Bell, TrendingUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getDashboardStats, getNotifications, getCalendarEvents } from '../services/meta.service';
import { getMatchedUsers } from '../services/matching.service';
import { createSwapRequest, getMyClasses } from '../services/swap.service';
import { getAllSkills, getUserSkills } from '../services/skill.service';
import { Button } from '../components/ui/Button';
import { toast } from 'react-hot-toast';
import InputDialog from '../components/ui/InputDialog';
import { StatCardSkeleton } from '../components/ui/Skeleton';

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

            <div className="rounded-xl border border-white/10 bg-[#0F172A] p-5">
                <div className="flex flex-col gap-3">
                    <p className="text-sm uppercase tracking-wide text-gray-400">Next Session</p>
                    {nextSession ? (
                        <>
                            <p className="text-lg font-semibold text-white">
                                {(nextSession.classInfo?.swapRequest?.learnSkill?.skill?.name || 'Skill Session')} with {nextSession.classInfo?.swapRequest?.fromUser?.username === user?.username
                                    ? nextSession.classInfo?.swapRequest?.toUser?.username
                                    : nextSession.classInfo?.swapRequest?.fromUser?.username}
                            </p>
                            <p className="inline-flex items-center gap-2 text-sm text-gray-400">
                                <CalendarDays className="h-4 w-4 text-gray-400" />
                                {formatSessionTime(nextSession.eventDate)}
                            </p>
                            <Button
                                className="w-fit rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
                                onClick={() => navigate(`/swaps/${nextSession.classInfo.id}`)}
                            >
                                Join Classroom
                            </Button>
                        </>
                    ) : (
                        <>
                            <p className="text-lg font-semibold text-white">No upcoming session</p>
                            <p className="inline-flex items-center gap-2 text-sm text-gray-400">
                                <Clock className="h-4 w-4 text-gray-400" />
                                Schedule a session from your classroom.
                            </p>
                            <Button
                                className="w-fit rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
                                onClick={() => navigate('/swaps')}
                            >
                                Go to My Swaps
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="section-card">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="section-title">Active Swaps</h2>
                    <Link to="/swaps" className="text-sm text-[#8DA0BF] hover:text-[#0A4D9F]">View all</Link>
                </div>

                {activeSwaps.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-[#0F172A] p-6 text-center">
                        <p className="text-sm text-gray-400">No active swaps right now.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {activeSwaps.slice(0, 4).map((swap) => {
                            const teachSkill = swap?.swapRequest?.teachSkill?.skill?.name || 'Skill';
                            const learnSkill = swap?.swapRequest?.learnSkill?.skill?.name || 'Skill';
                            const sessionDate = nextSessionByClassId[swap.id] || null;

                            return (
                                <div key={swap.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0F172A] p-4">
                                    <div>
                                        <p className="text-sm font-medium text-white">{teachSkill} <span className="mx-1 text-gray-400">⇄</span> {learnSkill}</p>
                                        <p className="mt-1 text-xs text-gray-400">Next session</p>
                                        <p className="text-xs text-gray-300">{formatSessionTime(sessionDate)}</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        className="rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-500"
                                        onClick={() => navigate(`/swaps/${swap.id}`)}
                                    >
                                        Go to Classroom
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Suggested Swaps */}
            {matches.length > 0 && (
                <div className="section-card">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="section-title flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-yellow-500" /> Suggested Swaps
                        </h2>
                        <Link to="/discover" className="text-sm text-[#8DA0BF] hover:text-[#0A4D9F]">Browse all</Link>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {matches.map((m) => (
                            <div key={m.userId} className="h-full rounded-2xl border border-white/10 bg-[#0E1620] p-4 transition duration-200 hover:-translate-y-1 hover:bg-[#151D27]">
                                <div className="mb-3 flex items-center gap-3">
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
                                        <span className="text-xs text-[#F59E0B]">{m.avgRating > 0 ? `${m.avgRating} ★ (${m.reviewCount})` : 'New user'}</span>
                                    </div>
                                </div>

                                <div className="mb-3 rounded-lg border border-white/10 bg-[#0F172A] p-3">
                                    <div className="flex items-center justify-center gap-4">
                                        <div className="w-24 rounded-lg border border-white/10 bg-[#111721] px-3 py-2 text-center">
                                            <p className="truncate text-sm text-white">{m.mutualLearnSkills?.[0]?.skillName || 'Not set'}</p>
                                            <p className="mt-1 text-xs text-gray-400">Teaches</p>
                                        </div>
                                        <Repeat2 className="h-4 w-4 text-gray-400" />
                                        <div className="w-24 rounded-lg border border-white/10 bg-[#111721] px-3 py-2 text-center">
                                            <p className="truncate text-sm text-white">{m.matchingTeachSkills?.[0]?.skillName || 'Not set'}</p>
                                            <p className="mt-1 text-xs text-gray-400">Learns</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <p className="mb-2 text-xs uppercase tracking-wide text-gray-400">Availability</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(m.availability || []).slice(0, 4).map((day) => (
                                            <span key={`${m.userId}-${day}`} className="rounded-md bg-blue-500/10 px-2 py-1 text-xs text-blue-400">
                                                {String(day).slice(0, 3)}
                                            </span>
                                        ))}
                                        {(!m.availability || m.availability.length === 0) && (
                                            <span className="text-xs text-gray-400">Not set</span>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-auto flex gap-2">
                                    <Link to={`/u/${m.username}`} className="flex-1">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="w-full border border-white/10 bg-transparent text-gray-300 hover:bg-white/5"
                                        >
                                            View Profile
                                        </Button>
                                    </Link>
                                    <Button
                                        size="sm"
                                        className="flex-1 bg-blue-600 text-white hover:bg-blue-500"
                                        onClick={() => handleQuickSwap(m.userId, m.matchingTeachSkills[0]?.skillId)}
                                    >
                                        Request Swap
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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

            <div className="section-card bg-[#0F172A] border border-white/10 rounded-xl p-5">
                <h2 className="section-title mb-4">Online Now</h2>
                {onlineUsers.length === 0 ? (
                    <p className="text-sm text-gray-400">No online users right now.</p>
                ) : (
                    <div className="space-y-3">
                        {onlineUsers.map((person) => (
                            <div key={person.userId} className="group flex items-center justify-between rounded-lg p-2 transition hover:bg-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="relative h-8 w-8 rounded-full bg-gray-700">
                                        {person.avatarUrl ? (
                                            <img src={person.avatarUrl} alt={person.username} className="h-8 w-8 rounded-full object-cover" />
                                        ) : (
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0A4D9F]/30 text-xs font-semibold text-white">
                                                {(person.username || 'U')[0].toUpperCase()}
                                            </div>
                                        )}
                                        <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-[#0F172A] bg-green-400" />
                                    </div>
                                    <p className="text-sm text-white">{person.username}</p>
                                </div>
                                <div className="hidden items-center gap-2 group-hover:flex">
                                    <Link to={`/u/${person.username}`} className="text-xs text-[#8DA0BF] hover:text-white">View Profile</Link>
                                    <Link to="/swaps" className="text-xs text-[#8DA0BF] hover:text-white">Send Message</Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
