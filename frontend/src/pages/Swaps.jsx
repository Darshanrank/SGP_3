import { useEffect, useMemo, useState } from 'react';
import { getMyRequests, updateRequestStatus, getMyClasses, blockUser, getMyBlockedUsers, submitReport, unblockUser, getPublicProfileByUsername, getCalendarEvents } from '../services/swapsPage.service';
import { Button } from '../components/ui/Button';
import { ListItemSkeleton } from '../components/ui/Skeleton';
import { StatusBadge, SwapTimeline, SwapsHeaderStats, SwapsModals, SwapsControlPanel } from '../components/swaps';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft, CheckCircle, XCircle, Ban, MessageSquare, Inbox, Send, Users, MoreVertical, MessageCircle, User, Repeat2, CalendarDays, Shield } from 'lucide-react';

const reportReasons = ['SPAM', 'HARASSMENT', 'SCAM_OR_FRAUD', 'INAPPROPRIATE_CONTENT', 'IMPERSONATION', 'OTHER'];

const statusConfig = {
    PENDING: { label: 'Pending' },
    ACCEPTED: { label: 'Accepted' },
    REJECTED: { label: 'Rejected' },
    COMPLETED: { label: 'Completed' },
    CANCELLED: { label: 'Cancelled' }
};

const timeAgo = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const Swaps = () => {
    const { user } = useAuth();
    const { chatUnreadByClass } = useSocket();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('received');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [videoPreview, setVideoPreview] = useState(null); // { skillName, videoUrl, proofUrl }
    const [safetyBusy, setSafetyBusy] = useState(false);
    const [blockMenuOpen, setBlockMenuOpen] = useState(false);
    const [actionMenuKey, setActionMenuKey] = useState(null);
    const [blockConfirm, setBlockConfirm] = useState({ open: false, userId: null, username: '' });
    const [reportModal, setReportModal] = useState({ open: false, userId: null, username: '' });
    const [reportReason, setReportReason] = useState('HARASSMENT');
    const [reportDescription, setReportDescription] = useState('');
    const [hoveredUsername, setHoveredUsername] = useState(null);
    const [loadingPreviewUsername, setLoadingPreviewUsername] = useState(null);
    const [profilePreviewCache, setProfilePreviewCache] = useState({});

    useEffect(() => {
        const handleDocClick = (event) => {
            if (!event.target.closest('[data-swap-action-menu]')) {
                setActionMenuKey(null);
            }
        };
        document.addEventListener('click', handleDocClick);
        return () => document.removeEventListener('click', handleDocClick);
    }, []);

    const { data: sentRequests = [], isLoading: loadingSent } = useQuery({
        queryKey: ['swaps', 'sent'],
        queryFn: async () => {
            const res = await getMyRequests('sent');
            return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        },
        staleTime: 30000,
    });

    const { data: receivedRequests = [], isLoading: loadingReceived } = useQuery({
        queryKey: ['swaps', 'received'],
        queryFn: async () => {
            const res = await getMyRequests('received');
            return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        },
        staleTime: 30000,
    });

    const { data: activeClasses = [], isLoading: loadingClasses } = useQuery({
        queryKey: ['swaps', 'classes'],
        queryFn: async () => {
            const res = await getMyClasses();
            return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        },
        staleTime: 30000,
    });

    const { data: calendarEventsPayload } = useQuery({
        queryKey: ['swaps', 'calendar-events'],
        queryFn: async () => {
            const res = await getCalendarEvents(1, 200);
            return res;
        },
        staleTime: 30000,
    });

    const {
        data: blockedUsers = [],
        isLoading: loadingBlockedUsers,
        refetch: refetchBlockedUsers,
    } = useQuery({
        queryKey: ['swaps', 'blocked-users'],
        queryFn: async () => {
            const res = await getMyBlockedUsers();
            return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        },
        staleTime: 15000,
    });

    // Confirm dialogs
    const [confirmDialog, setConfirmDialog] = useState({ open: false, requestId: null, action: '', title: '', message: '' });
    const [cancelDialog, setCancelDialog] = useState({ open: false, requestId: null, targetUsername: '' });

    const openConfirm = (requestId, action, title, message) => {
        setConfirmDialog({ open: true, requestId, action, title, message });
    };

    const openCancelDialog = (requestId, targetUsername) => {
        setCancelDialog({ open: true, requestId, targetUsername });
    };

    const closeCancelDialog = () => {
        setCancelDialog({ open: false, requestId: null, targetUsername: '' });
    };

    const handleConfirmAction = async () => {
        const { requestId, action } = confirmDialog;
        setConfirmDialog({ open: false, requestId: null, action: '', title: '', message: '' });
        try {
            await updateRequestStatus(requestId, action);
            toast.success(
                action === 'ACCEPTED' ? 'Request accepted! A class has been created.' :
                action === 'REJECTED' ? 'Request rejected.' :
                'Request cancelled.'
            );
            queryClient.invalidateQueries({ queryKey: ['swaps'] });
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to update request');
        }
    };

    const handleCancelWithReason = async (reason) => {
        const { requestId } = cancelDialog;
        closeCancelDialog();
        try {
            await updateRequestStatus(requestId, 'CANCELLED', reason);
            toast.success('Request cancelled.');
            queryClient.invalidateQueries({ queryKey: ['swaps'] });
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to cancel request');
        }
    };

    // Filter logic
    const filterRequests = (requests) => {
        if (statusFilter === 'ALL') return requests;
        return requests.filter(r => r.status === statusFilter);
    };

    const calendarEvents = Array.isArray(calendarEventsPayload)
        ? calendarEventsPayload
        : Array.isArray(calendarEventsPayload?.data)
            ? calendarEventsPayload.data
            : [];

    const nextSessionByClassId = useMemo(() => {
        const now = new Date();
        const mapped = {};

        calendarEvents.forEach((event) => {
            const classId = event?.swapClassId;
            if (!classId) return;

            const eventDate = event?.eventDate ? new Date(event.eventDate) : null;
            if (!eventDate || Number.isNaN(eventDate.getTime())) return;

            const current = mapped[classId];
            if (eventDate < now) return;
            if (!current || eventDate < current) {
                mapped[classId] = eventDate;
            }
        });

        return mapped;
    }, [calendarEvents]);

    const formatNextSession = (sessionDate) => {
        if (!sessionDate) return 'No session scheduled';
        return sessionDate.toLocaleString('en-US', {
            weekday: 'short',
            hour: 'numeric',
            minute: '2-digit'
        }).replace(',', ' •');
    };

    const renderSwapDirectionBlock = ({ teachSkill, learnSkill, teachLabel = 'You teach', learnLabel = 'You learn' }) => (
        <div className="mt-3 flex items-center justify-center gap-4">
            <div className="w-28 rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2 text-center">
                <p className="truncate text-sm font-medium text-[#DCE7F5]">{teachSkill || 'Not specified'}</p>
                <p className="mt-1 text-[11px] text-[#8DA0BF]">{teachLabel}</p>
            </div>

            <Repeat2 className="h-4 w-4 shrink-0 text-gray-400" />

            <div className="w-28 rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2 text-center">
                <p className="truncate text-sm font-medium text-[#DCE7F5]">{learnSkill || 'Not specified'}</p>
                <p className="mt-1 text-[11px] text-[#8DA0BF]">{learnLabel}</p>
            </div>
        </div>
    );

    const renderTabEmptyState = (title, description) => (
        <div className="mx-auto max-w-xl rounded-xl border border-white/10 bg-[#0F172A] p-8 text-center">
            <h3 className="text-lg font-medium text-white">{title}</h3>
            <p className="mt-2 text-sm text-gray-400">{description}</p>
            <Button
                size="sm"
                className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
                onClick={() => navigate('/discover')}
            >
                Discover Skills
            </Button>
        </div>
    );

    const handleOpenChat = (swapClassId) => {
        if (!swapClassId) {
            toast('Chat will be available once the request is accepted.');
            return;
        }
        navigate(`/swaps/${swapClassId}`);
    };

    const openReportForUser = (userId, username) => {
        setReportModal({ open: true, userId, username });
        setActionMenuKey(null);
    };

    const openBlockConfirm = (userId, username) => {
        setBlockConfirm({ open: true, userId, username });
        setActionMenuKey(null);
    };

    const handleSubmitReport = async () => {
        if (!reportModal.userId) return;
        setSafetyBusy(true);
        try {
            await submitReport({
                reportedUserId: reportModal.userId,
                reason: reportReason,
                description: reportDescription.trim() || undefined
            });
            toast.success('Report submitted');
            setReportDescription('');
            setReportModal({ open: false, userId: null, username: '' });
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to submit report');
        } finally {
            setSafetyBusy(false);
        }
    };

    const handleTabChange = (tabKey) => {
        setActiveTab(tabKey);
        setStatusFilter(tabKey === 'classes' ? 'ONGOING' : 'ALL');
        setBlockMenuOpen(false);
        setActionMenuKey(null);
    };

    const handleUnblockUser = async (blockedUserId, handle) => {
        if (!blockedUserId) return;
        setSafetyBusy(true);
        try {
            await unblockUser(blockedUserId);
            toast.success(`Unblocked ${handle}`);
            queryClient.invalidateQueries({ queryKey: ['swaps', 'blocked-users'] });
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to unblock user');
        } finally {
            setSafetyBusy(false);
        }
    };

    const handleConfirmBlock = async () => {
        if (!blockConfirm.userId) return;
        setSafetyBusy(true);
        try {
            await blockUser(blockConfirm.userId);
            toast.success(`Blocked @${blockConfirm.username}`);
            setBlockConfirm({ open: false, userId: null, username: '' });
            queryClient.invalidateQueries({ queryKey: ['swaps', 'blocked-users'] });
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to block user');
        } finally {
            setSafetyBusy(false);
        }
    };

    const loadProfilePreview = async (username) => {
        if (!username || profilePreviewCache[username]) return;
        setLoadingPreviewUsername(username);
        try {
            const profile = await getPublicProfileByUsername(username);
            setProfilePreviewCache((prev) => ({ ...prev, [username]: profile }));
        } catch (_) {
            setProfilePreviewCache((prev) => ({ ...prev, [username]: null }));
        } finally {
            setLoadingPreviewUsername((prev) => (prev === username ? null : prev));
        }
    };

    const renderProfileHoverCard = (username) => {
        if (hoveredUsername !== username) return null;

        const profile = profilePreviewCache[username];
        const isLoading = loadingPreviewUsername === username;
        const teaches = (profile?.userSkills || [])
            .filter((item) => item.type === 'TEACH')
            .map((item) => item?.skill?.name)
            .filter(Boolean)
            .slice(0, 3);
        const availability = Array.isArray(profile?.availability)
            ? profile.availability.map((slot) => String(slot.dayOfWeek || '').slice(0, 3)).filter(Boolean).slice(0, 4)
            : [];
        const ratingValue = Number(profile?.reputationMetrics?.averageRating || 0);
        const ratingLabel = ratingValue > 0 ? ratingValue.toFixed(1) : 'New';
        const fullName = profile?.profile?.fullName || username;

        return (
            <div className="absolute left-0 top-full z-30 mt-2 w-56 rounded-lg border border-white/10 bg-[#0F172A] p-4 shadow-lg">
                {isLoading ? (
                    <p className="text-xs text-[#8DA0BF]">Loading profile...</p>
                ) : !profile ? (
                    <p className="text-xs text-[#8DA0BF]">Profile preview unavailable.</p>
                ) : (
                    <>
                        <div className="flex items-center gap-2">
                            {profile?.profile?.avatarUrl ? (
                                <img src={profile.profile.avatarUrl} alt={fullName} loading="lazy" className="h-9 w-9 rounded-full object-cover" />
                            ) : (
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A4D9F]/30 text-sm font-semibold text-[#DCE7F5]">
                                    {String(fullName)[0].toUpperCase()}
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[#DCE7F5]">{fullName}</p>
                                <p className="truncate text-xs text-[#8DA0BF]">@{username}</p>
                            </div>
                        </div>
                        <p className="mt-2 text-xs text-[#DCE7F5]">⭐ {ratingLabel}</p>
                        <p className="mt-2 text-xs text-[#8DA0BF]">Teaches:</p>
                        <p className="text-xs text-[#DCE7F5]">{teaches.length ? teaches.join(', ') : 'Not listed'}</p>
                        <p className="mt-2 text-xs text-[#8DA0BF]">Availability:</p>
                        <p className="text-xs text-[#DCE7F5]">{availability.length ? availability.join(' ') : 'Not set'}</p>
                    </>
                )}
            </div>
        );
    };

    const renderCardActionMenu = ({ menuKey, userId, username, chatClassId }) => {
        if (!userId) return null;
        const isOpen = actionMenuKey === menuKey;

        return (
            <div className="relative" data-swap-action-menu>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setActionMenuKey((prev) => (prev === menuKey ? null : menuKey));
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#0E1620] text-[#8DA0BF] transition hover:bg-[#1F2937] hover:text-[#DCE7F5]"
                    aria-label="Open actions"
                >
                    <MoreVertical className="h-4 w-4" />
                </button>

                {isOpen && (
                    <div className="absolute right-0 top-10 z-30 w-44 rounded-xl border border-white/5 bg-[#111827] p-2 shadow-[0_16px_40px_rgba(0,0,0,0.55)]">
                        <button
                            type="button"
                            onClick={() => {
                                navigate(`/u/${username}`);
                                setActionMenuKey(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-[#DCE7F5] transition hover:bg-[#1F2937]"
                        >
                            <User className="h-4 w-4" />
                            View Profile
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                handleOpenChat(chatClassId);
                                setActionMenuKey(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-[#DCE7F5] transition hover:bg-[#1F2937]"
                        >
                            <MessageCircle className="h-4 w-4" />
                            Open Chat
                        </button>
                        <button
                            type="button"
                            onClick={() => openReportForUser(userId, username)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-[#DCE7F5] transition hover:bg-[#1F2937]"
                        >
                            <Shield className="h-4 w-4" />
                            Report User
                        </button>
                        <button
                            type="button"
                            onClick={() => openBlockConfirm(userId, username)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-red-400 transition hover:bg-red-500/10"
                        >
                            <Ban className="h-4 w-4" />
                            Block User
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const pendingReceivedCount = receivedRequests.filter(r => r.status === 'PENDING').length;
    const pendingSentCount = sentRequests.filter(r => r.status === 'PENDING').length;
    const ongoingClasses = activeClasses.filter((c) => c.status !== 'COMPLETED');
    const completedClasses = activeClasses.filter((c) => c.status === 'COMPLETED');
    const ongoingClassCount = ongoingClasses.length;
    const completedClassCount = completedClasses.length;

    const tabs = [
        { key: 'received', label: 'Received', icon: Inbox, badge: pendingReceivedCount },
        { key: 'sent', label: 'Sent', icon: Send, badge: pendingSentCount },
        { key: 'classes', label: 'Classes', icon: Users, badge: ongoingClassCount },
    ];

    const blockedUsersCount = blockedUsers.length;
    const activeSwapsCount = ongoingClasses.filter((c) => c.status === 'ONGOING').length;
    const pendingRequestsCount = [...receivedRequests, ...sentRequests].filter((r) => r.status === 'PENDING').length;
    const completedSwapsCount = completedClasses.length;

    const renderRequestCard = (req, type) => {
        const isReceived = type === 'received';
        const otherUser = isReceived ? req.fromUser : req.toUser;
        const otherUsername = otherUser?.username || 'Unknown';
        const otherUserId = otherUser?.userId;
        const requestTimelineStep = (() => {
            if (req.status === 'PENDING') return 0;
            if (req.status === 'REJECTED') return 0;
            if (req.status === 'CANCELLED') return req.swapClass ? 2 : 0;
            if (req.status === 'ACCEPTED') {
                if (req.swapClass?.status === 'COMPLETED') return 3;
                if (req.swapClass) return 2;
                return 1;
            }
            return 0;
        })();
        const teachSkillName = isReceived ? req.learnSkill?.skill?.name : req.teachSkill?.skill?.name;
        const learnSkillName = isReceived ? req.teachSkill?.skill?.name : req.learnSkill?.skill?.name;
        const nextSession = req.swapClass?.id ? nextSessionByClassId[req.swapClass.id] : null;

        return (
            <div key={req.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#111721] shadow-[0_16px_40px_rgba(0,0,0,0.55)] transition duration-200 hover:-translate-y-1 hover:bg-[#151D27]">
                <div className="p-4">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3">
                        <div
                            className="relative flex min-w-0 items-center gap-3"
                            onMouseEnter={() => {
                                setHoveredUsername(otherUsername);
                                loadProfilePreview(otherUsername);
                            }}
                            onMouseLeave={() => setHoveredUsername((prev) => (prev === otherUsername ? null : prev))}
                        >
                            <div className="h-10 w-10 shrink-0 rounded-full bg-[#0A4D9F]/25 flex items-center justify-center text-[#DCE7F5] font-bold text-sm">
                                {otherUsername[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Link to={`/u/${otherUsername}`} className="font-semibold text-[#DCE7F5] hover:text-[#0A4D9F] transition-colors">
                                        {otherUsername}
                                    </Link>
                                    <span className="text-xs text-[#6F83A3]">{isReceived ? 'sent you a request' : 'received your request'}</span>
                                </div>
                                <p className="mt-0.5 text-xs text-[#6F83A3]">{timeAgo(req.createdAt)}</p>
                            </div>
                            {renderProfileHoverCard(otherUsername)}
                        </div>
                        <div className="flex items-center gap-2">
                            <StatusBadge status={req.status} />
                            {renderCardActionMenu({
                                menuKey: `request-${req.id}`,
                                userId: otherUserId,
                                username: otherUsername,
                                chatClassId: req.swapClass?.id
                            })}
                        </div>
                    </div>

                    {renderSwapDirectionBlock({
                        teachSkill: teachSkillName,
                        learnSkill: learnSkillName,
                        teachLabel: 'You teach',
                        learnLabel: 'You learn'
                    })}

                    <div className="mt-3 rounded-lg border border-white/10 bg-[#0E1620] p-3">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">Next Session</p>
                        <p className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-white">
                            <CalendarDays className="h-4 w-4 text-gray-400" />
                            {formatNextSession(nextSession)}
                        </p>
                    </div>

                    {/* Message */}
                    {req.message && (
                        <div className="mt-3 flex items-start gap-2 rounded-lg border border-white/10 bg-[#0E1620] p-3">
                            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#8DA0BF]" />
                            <p className="text-sm italic text-[#8DA0BF]">&ldquo;{req.message}&rdquo;</p>
                        </div>
                    )}

                    {/* Cancel reason */}
                    {req.cancelReason && (
                        <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                            <p className="text-sm font-medium text-red-300">Cancellation reason</p>
                            <p className="mt-1 text-sm text-red-200">{req.cancelReason}</p>
                        </div>
                    )}

                    <SwapTimeline activeStep={requestTimelineStep} />
                </div>

                {/* Actions footer */}
                {req.status === 'PENDING' && (
                    <div className="flex justify-end gap-2 border-t border-white/10 bg-[#0E1620] px-4 py-2.5">
                        {isReceived ? (
                            <>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => openConfirm(req.id, 'REJECTED', 'Reject Request', `Are you sure you want to reject the swap request from @${otherUsername}?`)}
                                >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => openConfirm(req.id, 'ACCEPTED', 'Accept Request', `Accept the swap request from @${otherUsername}? A classroom will be created for you both.`)}
                                >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Accept
                                </Button>
                            </>
                        ) : (
                            <Button
                                size="sm"
                                variant="danger"
                                onClick={() => openCancelDialog(req.id, otherUsername)}
                            >
                                <Ban className="h-4 w-4 mr-1" />
                                Cancel Request
                            </Button>
                        )}
                    </div>
                )}

                {req.status === 'ACCEPTED' && !isReceived && (
                    <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 bg-[#0E1620] px-4 py-2.5">
                        <Button
                            size="sm"
                            variant="danger"
                            onClick={() => openCancelDialog(req.id, otherUsername)}
                        >
                            <Ban className="h-4 w-4 mr-1" />
                            Cancel Request
                        </Button>
                    </div>
                )}

                <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 bg-[#0E1620] px-4 py-2.5">
                    {req.swapClass ? (
                        <Link to={`/swaps/${req.swapClass.id}`}>
                            <Button size="sm" variant="secondary" className="gap-1.5">
                                <ArrowRightLeft className="h-4 w-4" />
                                Go to Classroom
                            </Button>
                        </Link>
                    ) : (
                        <Button size="sm" variant="secondary" className="gap-1.5" disabled>
                            <ArrowRightLeft className="h-4 w-4" />
                            Classroom
                        </Button>
                    )}

                    <Button
                        size="sm"
                        variant="secondary"
                        className="gap-1.5 bg-[#0F172A] border border-white/10 text-gray-200 hover:bg-[#1E293B]"
                        onClick={() => handleOpenChat(req.swapClass?.id)}
                        disabled={!req.swapClass}
                    >
                        <MessageCircle className="h-4 w-4" />
                        Chat
                    </Button>

                    <Link to={`/u/${otherUsername}`}>
                        <Button size="sm" variant="secondary" className="gap-1.5">
                            <User className="h-4 w-4" />
                            Profile
                        </Button>
                    </Link>
                </div>
            </div>
        );
    };

    const renderClassCard = (cls) => {
        const fromUser = cls.swapRequest?.fromUser?.username || 'Unknown';
        const toUser = cls.swapRequest?.toUser?.username || 'Unknown';
        const partnerName = fromUser === user?.username ? toUser : fromUser;
        const partnerUserId = cls.swapRequest?.fromUser?.userId === user?.userId
            ? cls.swapRequest?.toUser?.userId
            : cls.swapRequest?.fromUser?.userId;
        const learnSkillObj = cls.swapRequest?.learnSkill;
        const teachSkillObj = cls.swapRequest?.teachSkill;
        const learnSkill = learnSkillObj?.skill?.name || 'Unknown';
        const teachSkill = teachSkillObj?.skill?.name;
        const classBadgeStatus = cls.status === 'COMPLETED'
            ? 'COMPLETED'
            : cls.status === 'CANCELLED'
                ? 'CANCELLED'
                : 'ACCEPTED';
        const classTimelineStep = cls.status === 'COMPLETED' ? 3 : 2;
        const isCompleted = cls.completion?.completedAt;
        const nextSession = nextSessionByClassId[cls.id] || null;

        const unreadForClass = chatUnreadByClass?.[String(cls.id)] || 0;

        return (
            <div key={cls.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#111721] shadow-[0_16px_40px_rgba(0,0,0,0.55)] transition duration-200 hover:-translate-y-1 hover:bg-[#151D27]">
                <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div
                            className="relative flex items-center gap-3"
                            onMouseEnter={() => {
                                setHoveredUsername(partnerName);
                                loadProfilePreview(partnerName);
                            }}
                            onMouseLeave={() => setHoveredUsername((prev) => (prev === partnerName ? null : prev))}
                        >
                            <div className="h-10 w-10 shrink-0 rounded-full bg-[#0A4D9F]/25 flex items-center justify-center text-[#DCE7F5] font-bold text-sm">
                                {partnerName[0].toUpperCase()}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <Link to={`/u/${partnerName}`} className="font-semibold text-[#DCE7F5] hover:text-[#0A4D9F] transition-colors">
                                        {partnerName}
                                    </Link>
                                </div>
                                <p className="mt-0.5 text-xs text-[#6F83A3]">Swap #{cls.id}</p>
                            </div>
                            {renderProfileHoverCard(partnerName)}
                        </div>
                        <div className="flex items-center gap-2">
                            <StatusBadge status={classBadgeStatus} />
                            {renderCardActionMenu({
                                menuKey: `class-${cls.id}`,
                                userId: partnerUserId,
                                username: partnerName,
                                chatClassId: cls.id
                            })}
                        </div>
                    </div>

                    {renderSwapDirectionBlock({
                        teachSkill,
                        learnSkill,
                        teachLabel: 'You teach',
                        learnLabel: 'You learn'
                    })}

                    <div className="mt-3 rounded-lg border border-white/10 bg-[#0E1620] p-3">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">Next Session</p>
                        <p className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-white">
                            <CalendarDays className="h-4 w-4 text-gray-400" />
                            {formatNextSession(nextSession)}
                        </p>
                    </div>

                    {/* Completion progress */}
                    {cls.status === 'ONGOING' && cls.completion && (
                        <div className="mt-3 rounded-lg border border-[#F59E0B]/25 bg-[#F59E0B]/10 p-3">
                            <p className="text-xs font-medium text-[#F59E0B]">
                                Completion: {[cls.completion.completedByUser1, cls.completion.completedByUser2].filter(Boolean).length}/2 users marked complete
                            </p>
                        </div>
                    )}

                    {isCompleted && (
                        <div className="mt-3 rounded-lg border border-[#22C55E]/25 bg-[#22C55E]/10 p-3">
                            <p className="text-xs font-medium text-[#22C55E]">
                                Completed on {new Date(cls.completion.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                        </div>
                    )}

                    <SwapTimeline activeStep={classTimelineStep} />
                </div>

                <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 bg-[#0E1620] px-4 py-2.5">
                    <Link to={`/swaps/${cls.id}`}>
                        <Button size="sm" variant="secondary" className="relative gap-1.5">
                            <ArrowRightLeft className="h-4 w-4 mr-1" />
                            {cls.status === 'ONGOING' ? 'Enter Classroom' : 'View Details'}
                            {unreadForClass > 0 && (
                                <span className="ml-2 inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-[#0A4D9F] px-1.5 text-[10px] font-bold text-white">
                                    {unreadForClass > 99 ? '99+' : unreadForClass}
                                </span>
                            )}
                        </Button>
                    </Link>

                    <Button
                        size="sm"
                        variant="secondary"
                        className="gap-1.5 bg-[#0F172A] border border-white/10 text-gray-200 hover:bg-[#1E293B]"
                        onClick={() => handleOpenChat(cls.id)}
                    >
                        <MessageCircle className="h-4 w-4" />
                        Chat
                    </Button>

                    <Link to={`/u/${partnerName}`}>
                        <Button size="sm" variant="secondary" className="gap-1.5">
                            <User className="h-4 w-4" />
                            Profile
                        </Button>
                    </Link>
                </div>
            </div>
        );
    };

    return (
        <div className="page-shell">
            <SwapsModals
                videoPreview={videoPreview}
                setVideoPreview={setVideoPreview}
                reportModal={reportModal}
                setReportModal={setReportModal}
                reportReason={reportReason}
                setReportReason={setReportReason}
                reportReasons={reportReasons}
                reportDescription={reportDescription}
                setReportDescription={setReportDescription}
                safetyBusy={safetyBusy}
                onSubmitReport={handleSubmitReport}
                confirmDialog={confirmDialog}
                setConfirmDialog={setConfirmDialog}
                handleConfirmAction={handleConfirmAction}
                blockConfirm={blockConfirm}
                setBlockConfirm={setBlockConfirm}
                handleConfirmBlock={handleConfirmBlock}
                cancelDialog={cancelDialog}
                closeCancelDialog={closeCancelDialog}
                handleCancelWithReason={handleCancelWithReason}
            />

            <SwapsHeaderStats
                navigate={navigate}
                activeSwapsCount={activeSwapsCount}
                pendingRequestsCount={pendingRequestsCount}
                completedSwapsCount={completedSwapsCount}
            />

            <SwapsControlPanel
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                activeClasses={activeClasses}
                receivedRequests={receivedRequests}
                sentRequests={sentRequests}
                statusConfig={statusConfig}
                blockedUsersCount={blockedUsersCount}
                blockMenuOpen={blockMenuOpen}
                setBlockMenuOpen={setBlockMenuOpen}
                loadingBlockedUsers={loadingBlockedUsers}
                blockedUsers={blockedUsers}
                refetchBlockedUsers={refetchBlockedUsers}
                safetyBusy={safetyBusy}
                onUnblock={handleUnblockUser}
                onLearnMore={() => toast('Use the actions menu on swap cards to block users when needed.')}
            />

            {/* Content */}
            <div>
                {activeTab === 'received' && (
                    <div className="space-y-5">
                        {loadingReceived ? <ListItemSkeleton count={3} /> : (
                            filterRequests(receivedRequests).length === 0 ? (
                                renderTabEmptyState(
                                    statusFilter === 'ALL'
                                        ? 'No swaps yet.'
                                        : `No ${String(statusConfig[statusFilter]?.label || statusFilter).toLowerCase()} swaps yet.`,
                                    'Find users and start a new skill exchange.'
                                )
                            ) : (
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {filterRequests(receivedRequests).map(req => renderRequestCard(req, 'received'))}
                                </div>
                            )
                        )}
                    </div>
                )}

                {activeTab === 'sent' && (
                    <div className="space-y-5">
                        {loadingSent ? <ListItemSkeleton count={3} /> : (
                            filterRequests(sentRequests).length === 0 ? (
                                renderTabEmptyState(
                                    statusFilter === 'ALL'
                                        ? 'No swaps yet.'
                                        : `No ${String(statusConfig[statusFilter]?.label || statusFilter).toLowerCase()} swaps yet.`,
                                    'Find users and start a new skill exchange.'
                                )
                            ) : (
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {filterRequests(sentRequests).map(req => renderRequestCard(req, 'sent'))}
                                </div>
                            )
                        )}
                    </div>
                )}

                {activeTab === 'classes' && (
                    <div className="space-y-5">
                        {loadingClasses ? <ListItemSkeleton count={3} /> : (
                            (() => {
                                const filteredClasses = statusFilter === 'ALL'
                                    ? activeClasses
                                    : activeClasses.filter((cls) => cls.status === statusFilter);

                                if (filteredClasses.length === 0) {
                                    if (statusFilter === 'COMPLETED') {
                                        return renderTabEmptyState('No completed classes yet.', 'Completed swap classes will appear here.');
                                    }
                                    if (statusFilter === 'CANCELLED') {
                                        return renderTabEmptyState('No cancelled classes.', 'Cancelled swap classes will appear here.');
                                    }
                                    return renderTabEmptyState('No active classes yet.', 'Accepted swaps and ongoing classes will appear here.');
                                }

                                return (
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        {filteredClasses.map((cls) => renderClassCard(cls))}
                                    </div>
                                );
                            })()
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Swaps;
