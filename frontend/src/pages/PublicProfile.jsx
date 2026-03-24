import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getPublicProfile, getPublicProfileByUsername } from '../services/profile.service';
import { getUserRating, getUserReviews } from '../services/review.service';
import { blockUser, getBlockStatus, submitReport, unblockUser } from '../services/safety.service';
import { createSwapRequest, getMyClasses } from '../services/swap.service';
import { getUserSkills } from '../services/skill.service';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { toast } from 'react-hot-toast';
import { Star, Github, Linkedin, Globe, Youtube, ExternalLink, ChevronDown, ChevronUp, Trophy, Award, Zap, ArrowRightLeft, Play, MessageCircle } from 'lucide-react';

const levelLabel = { LOW: 'Beginner', MEDIUM: 'Intermediate', HIGH: 'Advanced' };
const levelColor = { LOW: 'bg-blue-100 text-blue-700', MEDIUM: 'bg-yellow-100 text-yellow-700', HIGH: 'bg-green-100 text-green-700' };
const reportReasons = ['SPAM', 'HARASSMENT', 'SCAM_OR_FRAUD', 'INAPPROPRIATE_CONTENT', 'IMPERSONATION', 'OTHER'];
const dayLabelMap = {
    MONDAY: 'Mon',
    TUESDAY: 'Tue',
    WEDNESDAY: 'Wed',
    THURSDAY: 'Thu',
    FRIDAY: 'Fri',
    SATURDAY: 'Sat',
    SUNDAY: 'Sun'
};

const formatAvailabilityTime = (value) => {
    if (!value || typeof value !== 'string') return '--';
    const [h, m] = value.split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return value;
    const meridiem = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${meridiem}`;
};

const formatTimeAgo = (dateValue) => {
    if (!dateValue) return 'Recently';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 'Recently';

    const diffMs = Date.now() - date.getTime();
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;

    if (diffMs < minute) return 'Just now';
    if (diffMs < hour) {
        const v = Math.floor(diffMs / minute);
        return `${v} minute${v === 1 ? '' : 's'} ago`;
    }
    if (diffMs < day) {
        const v = Math.floor(diffMs / hour);
        return `${v} hour${v === 1 ? '' : 's'} ago`;
    }
    if (diffMs < week) {
        const v = Math.floor(diffMs / day);
        return `${v} day${v === 1 ? '' : 's'} ago`;
    }
    const v = Math.floor(diffMs / week);
    return `${v} week${v === 1 ? '' : 's'} ago`;
};

const formatExperienceLabel = (createdAt) => {
    if (!createdAt) return 'N/A';
    const created = new Date(createdAt);
    if (Number.isNaN(created.getTime())) return 'N/A';

    const now = new Date();
    const months = Math.max(1, Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));

    if (months < 12) {
        return `${months} month${months === 1 ? '' : 's'}`;
    }

    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    if (remMonths === 0) return `${years} year${years === 1 ? '' : 's'}`;
    return `${years}y ${remMonths}m`;
};

const SocialLink = ({ href, icon: Icon, label, color }) => {
    if (!href) return null;
    const url = href.startsWith('http') ? href : `https://${href}`;
    return (
        <a href={url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${color}`}>
            <Icon className="h-4 w-4" />
            {label}
        </a>
    );
};

const SkillCard = ({ skill, sessionsCount = 0, mode = 'teach' }) => {
    const [expanded, setExpanded] = useState(false);
    const hasDetails = skill.preview?.videoUrl || skill.proofUrl;
    const progressPercent = Math.min(100, sessionsCount * 20);
    const progressLabel = mode === 'teach' ? 'Teaching progress' : 'Learning progress';

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden transition-shadow hover:shadow-md">
            <button
                type="button"
                onClick={() => hasDetails && setExpanded(!expanded)}
                className={`w-full flex items-center justify-between p-4 text-left ${hasDetails ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'}`}
            >
                <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">{skill.skill.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelColor[skill.level] || 'bg-gray-100 text-gray-600'}`}>
                        {levelLabel[skill.level] || skill.level}
                    </span>
                </div>
                {hasDetails && (
                    <span className="flex items-center gap-1 text-xs text-blue-600">
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <><Play className="h-3 w-3" /><ChevronDown className="h-4 w-4" /></>}
                    </span>
                )}
            </button>

            <div className="border-t border-gray-100 bg-white p-3 space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Level</span>
                    <span className="font-medium text-gray-800">{levelLabel[skill.level] || skill.level}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Experience</span>
                    <span className="font-medium text-gray-800">{formatExperienceLabel(skill.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{mode === 'teach' ? 'Taught' : 'Learned'}</span>
                    <span className="font-medium text-gray-800">{sessionsCount} session{sessionsCount === 1 ? '' : 's'}</span>
                </div>
                <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                        <span>{progressLabel}</span>
                        <span>{progressPercent}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200">
                        <div className="h-2 rounded-full bg-blue-500" style={{ width: `${progressPercent}%` }} />
                    </div>
                </div>
            </div>

            {expanded && hasDetails && (
                <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
                    {skill.preview?.videoUrl && (
                        <div>
                            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Video Demo</p>
                            <video
                                src={skill.preview.videoUrl}
                                controls
                                className="w-full rounded-lg border border-gray-200 max-h-64"
                            />
                        </div>
                    )}
                    {skill.proofUrl && (
                        <div>
                            <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Proof Link</p>
                            <a
                                href={skill.proofUrl.startsWith('http') ? skill.proofUrl : `https://${skill.proofUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                {skill.proofUrl}
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const PublicProfile = () => {
    const { userId, username } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [accessError, setAccessError] = useState('');
    const [rating, setRating] = useState({ avgRating: 0, reviewCount: 0 });
    const [reviews, setReviews] = useState([]);
    const [blockStatus, setBlockStatus] = useState({ isBlocking: false, isBlockedBy: false, blocked: false });
    const [safetyBusy, setSafetyBusy] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);
    const [reportReason, setReportReason] = useState('HARASSMENT');
    const [reportDescription, setReportDescription] = useState('');
    const [swapModalOpen, setSwapModalOpen] = useState(false);
    const [swapSubmitting, setSwapSubmitting] = useState(false);
    const [messageBusy, setMessageBusy] = useState(false);
    const [myTeachSkills, setMyTeachSkills] = useState([]);
    const [swapForm, setSwapForm] = useState({
        learnSkillId: '',
        teachSkillId: '',
        preferredDate: '',
        preferredTime: '',
        message: ''
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setAccessError('');
                const data = username
                    ? await getPublicProfileByUsername(username)
                    : await getPublicProfile(userId);
                setProfile(data);

                const uid = data?.userId;
                if (uid) {
                    const [ratingData, reviewsData] = await Promise.all([
                        getUserRating(uid).catch(() => ({ avgRating: 0, reviewCount: 0 })),
                        getUserReviews(uid, 1, 5).catch(() => ({ data: [] }))
                    ]);
                    setRating(ratingData);
                    setReviews(reviewsData?.data || []);
                }
            } catch (error) {
                console.error('Failed to load profile', error);
                const apiCode = error?.response?.data?.code;
                const apiMessage = error?.response?.data?.message;
                if (apiCode === 'USER_BLOCKED') {
                    setAccessError('You cannot view this profile because one of you has blocked the other.');
                } else {
                    setAccessError(apiMessage || 'Failed to load profile');
                }
            } finally {
                setLoading(false);
            }
        };

        if (username || userId) fetchProfile();
    }, [username, userId]);

    useEffect(() => {
        const fetchStatus = async () => {
            if (!user?.userId || !profile?.userId || user.userId === profile.userId) return;
            try {
                const status = await getBlockStatus(profile.userId);
                setBlockStatus(status || { isBlocking: false, isBlockedBy: false, blocked: false });
            } catch (_) {}
        };
        fetchStatus();
    }, [user?.userId, profile?.userId]);

    useEffect(() => {
        const loadMySkills = async () => {
            if (!user?.userId || !profile?.userId || user.userId === profile.userId) return;
            try {
                const skills = await getUserSkills();
                const teachOnly = Array.isArray(skills) ? skills.filter((skill) => skill.type === 'TEACH') : [];
                setMyTeachSkills(teachOnly);
            } catch (_) {
                setMyTeachSkills([]);
            }
        };
        loadMySkills();
    }, [user?.userId, profile?.userId]);

    const handleToggleBlock = async () => {
        if (!profile?.userId) return;
        setSafetyBusy(true);
        try {
            if (blockStatus?.isBlocking) {
                await unblockUser(profile.userId);
                setBlockStatus({ isBlocking: false, isBlockedBy: false, blocked: false });
                toast.success('User unblocked');
            } else {
                await blockUser(profile.userId);
                setBlockStatus({ isBlocking: true, isBlockedBy: false, blocked: true });
                toast.success('User blocked');
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to update block status');
        } finally {
            setSafetyBusy(false);
        }
    };

    const handleSubmitReport = async () => {
        if (!profile?.userId) return;
        setSafetyBusy(true);
        try {
            await submitReport({
                reportedUserId: profile.userId,
                reason: reportReason,
                description: reportDescription.trim() || undefined
            });
            toast.success('Report submitted to admins');
            setReportOpen(false);
            setReportDescription('');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to submit report');
        } finally {
            setSafetyBusy(false);
        }
    };

    const openSwapModal = () => {
        if (!profile?.userId) return;
        const firstLearnSkill = (profile.userSkills || []).find((skill) => skill.type === 'TEACH');
        setSwapForm((prev) => ({
            ...prev,
            learnSkillId: firstLearnSkill ? String(firstLearnSkill.id) : '',
            teachSkillId: '',
            preferredDate: '',
            preferredTime: '',
            message: ''
        }));
        setSwapModalOpen(true);
    };

    const handleSendSwapRequest = async () => {
        if (!profile?.userId) return;

        const learnSkillId = Number.parseInt(swapForm.learnSkillId, 10);
        if (!Number.isInteger(learnSkillId) || learnSkillId <= 0) {
            toast.error('Please select a skill you want to learn');
            return;
        }

        const teachSkillId = swapForm.teachSkillId ? Number.parseInt(swapForm.teachSkillId, 10) : undefined;
        const preferredBits = [];
        if (swapForm.preferredDate) preferredBits.push(`Date: ${swapForm.preferredDate}`);
        if (swapForm.preferredTime) preferredBits.push(`Time: ${swapForm.preferredTime}`);

        const scheduleLine = preferredBits.length > 0 ? `Preferred schedule - ${preferredBits.join(', ')}` : '';
        const customMessage = swapForm.message.trim();
        const fullMessage = [scheduleLine, customMessage].filter(Boolean).join('\n').slice(0, 1000);

        setSwapSubmitting(true);
        try {
            await createSwapRequest({
                toUserId: profile.userId,
                learnSkillId,
                teachSkillId: Number.isInteger(teachSkillId) ? teachSkillId : undefined,
                message: fullMessage || undefined
            });
            toast.success('Swap request sent successfully');
            setSwapModalOpen(false);
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to send swap request');
        } finally {
            setSwapSubmitting(false);
        }
    };

    const handleMessageUser = async () => {
        if (!profile?.userId || !profile?.username) return;

        setMessageBusy(true);
        try {
            const payload = await getMyClasses(1, 200);
            const classes = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : []);

            const existingClass = classes.find((cls) => {
                const fromId = cls?.swapRequest?.fromUserId;
                const toId = cls?.swapRequest?.toUserId;
                return fromId === profile.userId || toId === profile.userId;
            });

            if (existingClass?.id) {
                navigate(`/swaps/${existingClass.id}`);
                return;
            }

            toast('No class chat exists yet. Start a swap request to begin chatting.');
            navigate(`/swaps/new?to=${encodeURIComponent(profile.username)}`);
        } catch (_) {
            navigate(`/swaps/new?to=${encodeURIComponent(profile.username)}`);
        } finally {
            setMessageBusy(false);
        }
    };

    const profileUserId = profile?.userId ?? null;
    const profileCreatedAt = profile?.createdAt ?? null;
    const displayName = profile?.profile?.fullName || profile?.username || 'User';
    const teachSkills = profile?.userSkills?.filter((skill) => skill.type === 'TEACH') || [];
    const learnSkills = profile?.userSkills?.filter((skill) => skill.type === 'LEARN') || [];
    const availabilitySlots = Array.isArray(profile?.availability) ? profile.availability : [];
    const badges = profile?.badges || [];
    const recentSwaps = Array.isArray(profile?.recentSwaps) ? profile.recentSwaps : [];
    const reward = profile?.rewards || { points: 0, totalSwaps: 0 };
    const p = profile?.profile || {};
    const isOwnProfile = user?.userId === profileUserId;
    const teachSessionCountByUserSkillId = profile?.skillSessionStats?.teachSessionCountByUserSkillId || {};
    const learnSessionCountByUserSkillId = profile?.skillSessionStats?.learnSessionCountByUserSkillId || {};
    const trustIndicators = profile?.trustIndicators || {};
    const profileCompletion = profile?.profileCompletion || {};
    const profileCompletionPercent = Math.max(0, Math.min(100, Number(profileCompletion.percentage || 0)));

    const socialLinks = [
        { href: p.githubLink, icon: Github, label: 'GitHub', color: 'bg-gray-100 text-gray-800 hover:bg-gray-200' },
        { href: p.linkedinLink, icon: Linkedin, label: 'LinkedIn', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
        { href: p.portfolioLink, icon: Globe, label: 'Portfolio', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
        { href: p.youtubeLink, icon: Youtube, label: 'YouTube', color: 'bg-red-50 text-red-700 hover:bg-red-100' },
    ].filter(l => l.href);

    const detailedReviews = useMemo(() => {
        return reviews.map((review) => {
            const swapRequest = review?.swapClass?.swapRequest;
            const revieweeIsFrom = swapRequest?.fromUserId === profile.userId;
            const revieweeIsTo = swapRequest?.toUserId === profile.userId;

            const skillLearned = revieweeIsFrom
                ? swapRequest?.learnSkill?.skill?.name
                : revieweeIsTo
                    ? swapRequest?.teachSkill?.skill?.name
                    : (swapRequest?.learnSkill?.skill?.name || swapRequest?.teachSkill?.skill?.name || 'Skill session');

            const sessionType = swapRequest?.teachSkill && swapRequest?.learnSkill
                ? 'Skill Swap'
                : 'Teaching Session';

            return {
                ...review,
                reviewerName: review?.reviewer?.username || 'User',
                reviewDate: new Date(review.createdAt).toLocaleDateString('en-US', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                }),
                skillLearned: skillLearned || 'Skill session',
                sessionType,
                ratingValue: review.overallRating || review.rating || 0,
                commentText: (review.comment || '').trim()
            };
        });
    }, [reviews, profileUserId]);

    const recentActivityItems = useMemo(() => {
        const swapItems = recentSwaps.flatMap((swap) => {
            const items = [];
            const when = swap.endedAt || swap.startedAt;

            if (swap.status === 'COMPLETED') {
                items.push({
                    id: `swap-completed-${swap.classId}`,
                    icon: '🔁',
                    text: `Completed swap with ${swap.partner || 'a partner'}`,
                    at: when
                });
            }

            if (swap.taughtSkill) {
                items.push({
                    id: `swap-taught-${swap.classId}`,
                    icon: '📚',
                    text: `Taught ${swap.taughtSkill} session`,
                    at: when
                });
            }

            if (swap.learnedSkill) {
                items.push({
                    id: `swap-learned-${swap.classId}`,
                    icon: '🎓',
                    text: `Learned ${swap.learnedSkill}`,
                    at: when
                });
            }

            return items;
        });

        const reviewItems = detailedReviews.map((review) => ({
            id: `review-${review.id}`,
            icon: '⭐',
            text: `Received ${review.ratingValue}-star review from ${review.reviewerName}`,
            at: review.createdAt
        }));

        const badgeItems = badges.map((badgeEntry) => ({
            id: `badge-${badgeEntry.id}`,
            icon: '🏅',
            text: `Earned ${badgeEntry.badge?.name || 'a badge'}`,
            at: badgeEntry.createdAt || profileCreatedAt
        }));

        return [...swapItems, ...reviewItems, ...badgeItems]
            .sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime())
            .slice(0, 10)
            .map((activity) => ({
                ...activity,
                timeAgo: formatTimeAgo(activity.at)
            }));
    }, [badges, detailedReviews, profileCreatedAt, recentSwaps]);

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 animate-pulse">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                        <div className="w-28 h-28 bg-gray-200 rounded-full" />
                        <div className="flex-1 space-y-3 w-full">
                            <div className="h-8 bg-gray-200 rounded w-48" />
                            <div className="h-4 bg-gray-200 rounded w-32" />
                            <div className="h-20 bg-gray-200 rounded w-full" />
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
                    <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="max-w-4xl mx-auto py-16 text-center">
                <div className="text-6xl mb-4">😕</div>
                <h2 className="text-2xl font-bold text-gray-900">Profile unavailable</h2>
                <p className="text-gray-500 mt-2">{accessError || "This user doesn't exist or their profile is unavailable."}</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
            {swapModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSwapModalOpen(false)}>
                    <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#111721] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.55)]" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-[#DCE7F5]">Request Skill Swap</h3>
                        <p className="mt-1 text-sm text-[#8DA0BF]">Send a swap request to @{profile.username}</p>

                        <div className="mt-4 space-y-3">
                            <div>
                                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">Skill You Want to Learn</label>
                                <select
                                    value={swapForm.learnSkillId}
                                    onChange={(e) => setSwapForm((prev) => ({ ...prev, learnSkillId: e.target.value }))}
                                    className="w-full rounded-lg border border-white/10 bg-[#0E1620] px-3 py-2 text-sm text-[#DCE7F5]"
                                >
                                    <option value="">Select skill</option>
                                    {teachSkills.map((skill) => (
                                        <option key={skill.id} value={skill.id}>{skill.skill?.name || 'Skill'}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">Skill You Can Teach</label>
                                <select
                                    value={swapForm.teachSkillId}
                                    onChange={(e) => setSwapForm((prev) => ({ ...prev, teachSkillId: e.target.value }))}
                                    className="w-full rounded-lg border border-white/10 bg-[#0E1620] px-3 py-2 text-sm text-[#DCE7F5]"
                                >
                                    <option value="">Optional</option>
                                    {myTeachSkills.map((skill) => (
                                        <option key={skill.id} value={skill.id}>{skill.skill?.name || 'Skill'}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">Preferred Date</label>
                                    <input
                                        type="date"
                                        value={swapForm.preferredDate}
                                        onChange={(e) => setSwapForm((prev) => ({ ...prev, preferredDate: e.target.value }))}
                                        className="w-full rounded-lg border border-white/10 bg-[#0E1620] px-3 py-2 text-sm text-[#DCE7F5]"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">Preferred Time</label>
                                    <input
                                        type="time"
                                        value={swapForm.preferredTime}
                                        onChange={(e) => setSwapForm((prev) => ({ ...prev, preferredTime: e.target.value }))}
                                        className="w-full rounded-lg border border-white/10 bg-[#0E1620] px-3 py-2 text-sm text-[#DCE7F5]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">Message</label>
                                <textarea
                                    value={swapForm.message}
                                    onChange={(e) => setSwapForm((prev) => ({ ...prev, message: e.target.value }))}
                                    rows={4}
                                    maxLength={1000}
                                    placeholder="Add a message..."
                                    className="w-full rounded-lg border border-white/10 bg-[#0E1620] px-3 py-2 text-sm text-[#DCE7F5] placeholder:text-[#6F83A3]"
                                />
                            </div>
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setSwapModalOpen(false)}
                                className="rounded-lg bg-gray-700 px-4 py-2 font-medium text-white transition hover:bg-gray-600"
                                disabled={swapSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSendSwapRequest}
                                className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-500"
                                disabled={swapSubmitting}
                            >
                                {swapSubmitting ? 'Sending...' : 'Send Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {reportOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setReportOpen(false)}>
                    <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#111721] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.55)]" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-[#DCE7F5]">Report @{profile.username}</h3>
                        <p className="mt-1 text-sm text-[#8DA0BF]">Select a reason and optionally add details.</p>

                        <div className="mt-4 space-y-3">
                            <div>
                                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">Reason</label>
                                <select
                                    value={reportReason}
                                    onChange={(e) => setReportReason(e.target.value)}
                                    className="w-full rounded-lg border border-white/10 bg-[#0E1620] px-3 py-2 text-sm text-[#DCE7F5]"
                                >
                                    {reportReasons.map((reason) => (
                                        <option key={reason} value={reason}>{reason}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">Description (optional)</label>
                                <textarea
                                    value={reportDescription}
                                    onChange={(e) => setReportDescription(e.target.value)}
                                    rows={4}
                                    maxLength={1000}
                                    className="w-full rounded-lg border border-white/10 bg-[#0E1620] px-3 py-2 text-sm text-[#DCE7F5] placeholder:text-[#6F83A3]"
                                    placeholder="Provide context for admins"
                                />
                            </div>
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setReportOpen(false)} disabled={safetyBusy}>Cancel</Button>
                            <Button size="sm" variant="danger" onClick={handleSubmitReport} disabled={safetyBusy}>Submit Report</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ───── Profile Header ───── */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                    {p.avatarUrl ? (
                        <img
                            src={p.avatarUrl}
                            alt={displayName}
                            className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-md"
                        />
                    ) : (
                        <div className="w-28 h-28 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-4xl font-bold text-white shadow-md">
                            {displayName[0].toUpperCase()}
                        </div>
                    )}

                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-3xl font-bold text-gray-900">{displayName}</h1>
                        {profile.profile?.fullName && profile.username && (
                            <p className="text-gray-500 text-sm">@{profile.username}</p>
                        )}
                        <p className="text-gray-400 text-sm mt-1">Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>

                        {/* Rating */}
                        {rating.reviewCount > 0 && (
                            <div className="mt-2 flex items-center gap-2 justify-center md:justify-start">
                                <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <Star
                                            key={s}
                                            className={`h-4 w-4 ${s <= Math.round(rating.avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                        />
                                    ))}
                                </div>
                                <span className="text-sm font-semibold text-gray-700">{Number(rating.avgRating).toFixed(1)}</span>
                                <span className="text-sm text-gray-500">({rating.reviewCount} review{rating.reviewCount !== 1 ? 's' : ''})</span>
                            </div>
                        )}

                        {/* Social Links */}
                        {socialLinks.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
                                {socialLinks.map(link => (
                                    <SocialLink key={link.label} {...link} />
                                ))}
                            </div>
                        )}

                        {/* Bio */}
                        <div className="mt-5">
                            {p.bio ? (
                                <div className="text-gray-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: p.bio }} />
                            ) : (
                                <p className="text-gray-400 italic">No bio yet.</p>
                            )}
                        </div>

                        {!isOwnProfile && user?.userId && (
                            <div className="mt-5 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={openSwapModal}
                                    className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-500"
                                >
                                    Request Skill Swap
                                </button>
                                <button
                                    type="button"
                                    onClick={handleMessageUser}
                                    className="inline-flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 font-medium text-white transition hover:bg-gray-600"
                                    disabled={messageBusy}
                                >
                                    <MessageCircle className="h-4 w-4" />
                                    {messageBusy ? 'Opening...' : 'Message'}
                                </button>
                                <Button size="sm" variant="secondary" onClick={() => setReportOpen(true)} disabled={safetyBusy}>
                                    Report User
                                </Button>
                                <Button size="sm" variant={blockStatus?.isBlocking ? 'danger' : 'ghost'} onClick={handleToggleBlock} disabled={safetyBusy}>
                                    {blockStatus?.isBlocking ? 'Unblock User' : 'Block User'}
                                </Button>
                            </div>
                        )}

                        {p.learningLanguage && (
                            <div className="mt-4">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                                    🌐 Learning: {p.learningLanguage}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ───── Ranking & Stats ───── */}
            <div className="rounded-xl border border-white/10 bg-[#111721] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#DCE7F5]">
                    <Trophy className="h-5 w-5 text-[#F59E0B]" /> Rankings & Stats
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                            <span>Completed {Number(trustIndicators.completedSwaps || profile?.reputationMetrics?.totalSwaps || 0)} swaps</span>
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
                        <div
                            className="h-2 rounded-full bg-blue-500"
                            style={{ width: `${profileCompletionPercent}%` }}
                        />
                    </div>
                    {profileCompletion?.suggestion ? (
                        <p className="mt-3 text-xs text-[#8DA0BF]">{profileCompletion.suggestion}</p>
                    ) : null}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-[#111721] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
                    <h2 className="mb-4 text-lg font-bold text-[#DCE7F5]">Recent Activity</h2>
                    {recentActivityItems.length > 0 ? (
                        <div className="space-y-3">
                            {recentActivityItems.map((activity) => (
                                <div key={activity.id} className="flex items-start gap-3 rounded-lg border border-white/10 bg-[#0E1620] px-3 py-2.5">
                                    <span className="text-base leading-5">{activity.icon}</span>
                                    <div>
                                        <p className="text-sm text-[#DCE7F5]">{activity.text}</p>
                                        <p className="text-xs text-[#8DA0BF]">{activity.timeAgo}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-[#8DA0BF]">No recent activity yet.</p>
                    )}
                </div>

                <div className="rounded-xl border border-white/10 bg-[#111721] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
                    <h2 className="mb-4 text-lg font-bold text-[#DCE7F5]">Achievements</h2>
                    {badges.length > 0 ? (
                        <div className="flex flex-wrap gap-3">
                            {badges.map((badgeEntry) => (
                                <div
                                    key={badgeEntry.id}
                                    className="inline-flex items-center gap-2 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-3 py-2 text-sm text-[#FCD34D]"
                                    title={badgeEntry.badge?.condition || 'Achievement badge'}
                                >
                                    <span>🏅</span>
                                    <span className="font-medium">{badgeEntry.badge?.name || 'Badge'}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-[#8DA0BF]">No achievements yet.</p>
                    )}
                </div>
            </div>

            {/* ───── Skills ───── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Teaching Skills */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-green-700 flex items-center gap-2 mb-4">
                        <span className="w-2 h-2 bg-green-500 rounded-full" /> Can Teach
                        <span className="ml-auto text-sm font-normal text-gray-400">{teachSkills.length}</span>
                    </h2>
                    {teachSkills.length > 0 ? (
                        <div className="space-y-3">
                            {teachSkills.map(skill => (
                                <SkillCard
                                    key={skill.id}
                                    skill={skill}
                                    mode="teach"
                                    sessionsCount={Number(teachSessionCountByUserSkillId[skill.id] || 0)}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400 text-sm italic">No teaching skills listed yet.</p>
                    )}
                </div>

                {/* Learning Skills */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-blue-700 flex items-center gap-2 mb-4">
                        <span className="w-2 h-2 bg-blue-500 rounded-full" /> Wants to Learn
                        <span className="ml-auto text-sm font-normal text-gray-400">{learnSkills.length}</span>
                    </h2>
                    {learnSkills.length > 0 ? (
                        <div className="space-y-3">
                            {learnSkills.map(skill => (
                                <SkillCard
                                    key={skill.id}
                                    skill={skill}
                                    mode="learn"
                                    sessionsCount={Number(learnSessionCountByUserSkillId[skill.id] || 0)}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400 text-sm italic">No learning goals listed yet.</p>
                    )}
                </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#111721] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
                <h2 className="mb-4 text-lg font-bold text-[#DCE7F5]">🕒 Availability</h2>
                {availabilitySlots.length > 0 ? (
                    <div className="space-y-2">
                        {availabilitySlots.map((slot) => (
                            <div key={`${slot.id || slot.dayOfWeek}-${slot.startTime}-${slot.endTime}`} className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0E1620] px-3 py-2 text-sm text-[#DCE7F5]">
                                <span>{dayLabelMap[String(slot.dayOfWeek || '').toUpperCase()] || slot.dayOfWeek}</span>
                                <span className="text-[#8DA0BF]">{formatAvailabilityTime(slot.startTime)} - {formatAvailabilityTime(slot.endTime)}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-sm text-[#8DA0BF]">No availability added yet.</div>
                )}
            </div>

            {/* ───── Reviews ───── */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Reviews</h2>
                <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-sm font-semibold text-gray-800">⭐ {Number(rating.avgRating || 0).toFixed(1)} average rating</p>
                    <p className="text-xs text-gray-500">{rating.reviewCount || 0} total review{(rating.reviewCount || 0) === 1 ? '' : 's'}</p>
                </div>

                {detailedReviews.length > 0 ? (
                    <div className="space-y-4">
                        {detailedReviews.map((review) => (
                            <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-sm text-gray-900">{review.reviewerName}</p>
                                        <p className="text-xs text-gray-500">{review.reviewDate}</p>
                                    </div>
                                    <div className="flex items-center gap-0.5">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <Star
                                                key={s}
                                                className={`h-4 w-4 ${s <= review.ratingValue ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-3 space-y-1 text-sm text-gray-600">
                                    <p><span className="font-medium text-gray-700">Learned:</span> {review.skillLearned}</p>
                                    <p><span className="font-medium text-gray-700">Session:</span> {review.sessionType}</p>
                                </div>

                                <p className="mt-3 text-sm italic text-gray-600">{review.commentText ? `"${review.commentText}"` : 'No comment provided.'}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-400">No reviews yet.</p>
                )}
            </div>
        </div>
    );
};

export default PublicProfile;
