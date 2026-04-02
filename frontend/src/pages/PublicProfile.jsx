import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    getPublicProfile,
    getPublicProfileByUsername,
    getUserRating,
    getUserReviews,
    blockUser,
    getBlockStatus,
    submitReport,
    unblockUser,
    createSwapRequest,
    getMyClasses,
    getUserSkills
} from '../services/publicProfile.service';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    PublicProfileHeaderSection,
    PublicProfileModals,
    PublicProfileReviewsSection,
    PublicProfileSkillsSection,
    PublicProfileStatsSection,
    PublicProfileActivitySection,
    PublicProfileAvailabilitySection
} from '../components/publicProfile';
import { Github, Linkedin, Globe, Youtube } from 'lucide-react';

const reportReasons = ['SPAM', 'HARASSMENT', 'SCAM_OR_FRAUD', 'INAPPROPRIATE_CONTENT', 'IMPERSONATION', 'OTHER'];

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
        { href: p.githubLink, icon: Github, label: 'GitHub', color: 'border border-white/10 bg-[#0E1620] text-[#DCE7F5] hover:bg-[#151D27]' },
        { href: p.linkedinLink, icon: Linkedin, label: 'LinkedIn', color: 'border border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20' },
        { href: p.portfolioLink, icon: Globe, label: 'Portfolio', color: 'border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20' },
        { href: p.youtubeLink, icon: Youtube, label: 'YouTube', color: 'border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20' },
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
            <PublicProfileModals
                swapModalOpen={swapModalOpen}
                setSwapModalOpen={setSwapModalOpen}
                profile={profile}
                swapForm={swapForm}
                setSwapForm={setSwapForm}
                teachSkills={teachSkills}
                myTeachSkills={myTeachSkills}
                swapSubmitting={swapSubmitting}
                handleSendSwapRequest={handleSendSwapRequest}
                reportOpen={reportOpen}
                setReportOpen={setReportOpen}
                reportReason={reportReason}
                setReportReason={setReportReason}
                reportReasons={reportReasons}
                reportDescription={reportDescription}
                setReportDescription={setReportDescription}
                safetyBusy={safetyBusy}
                handleSubmitReport={handleSubmitReport}
            />

            <PublicProfileHeaderSection
                p={p}
                profile={profile}
                displayName={displayName}
                rating={rating}
                socialLinks={socialLinks}
                isOwnProfile={isOwnProfile}
                user={user}
                messageBusy={messageBusy}
                handleMessageUser={handleMessageUser}
                openSwapModal={openSwapModal}
                setReportOpen={setReportOpen}
                safetyBusy={safetyBusy}
                blockStatus={blockStatus}
                handleToggleBlock={handleToggleBlock}
            />

            <PublicProfileStatsSection
                reward={reward}
                badges={badges}
                rating={rating}
                trustIndicators={trustIndicators}
                totalSwaps={profile?.reputationMetrics?.totalSwaps}
                profileCompletionPercent={profileCompletionPercent}
                profileCompletion={profileCompletion}
            />

            <PublicProfileActivitySection recentActivityItems={recentActivityItems} badges={badges} />

            <PublicProfileSkillsSection
                teachSkills={teachSkills}
                learnSkills={learnSkills}
                teachSessionCountByUserSkillId={teachSessionCountByUserSkillId}
                learnSessionCountByUserSkillId={learnSessionCountByUserSkillId}
            />

            <PublicProfileAvailabilitySection availabilitySlots={availabilitySlots} />

            <PublicProfileReviewsSection rating={rating} detailedReviews={detailedReviews} />
        </div>
    );
};

export default PublicProfile;
