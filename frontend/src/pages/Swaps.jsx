import { useState } from 'react';
import { getMyRequests, updateRequestStatus, getMyClasses } from '../services/swap.service';
import { Button } from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import InputDialog from '../components/ui/InputDialog';
import { ListItemSkeleton } from '../components/ui/Skeleton';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft, Clock, CheckCircle, XCircle, Ban, MessageSquare, BookOpen, GraduationCap, Plus, Inbox, Send, Users, Play, X, ExternalLink } from 'lucide-react';

const statusConfig = {
    PENDING: { label: 'Pending', color: 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/35', icon: Clock },
    ACCEPTED: { label: 'Accepted', color: 'bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/35', icon: CheckCircle },
    REJECTED: { label: 'Rejected', color: 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/35', icon: XCircle },
    CANCELLED: { label: 'Cancelled', color: 'bg-[#8DA0BF]/15 text-[#8DA0BF] border-white/10', icon: Ban },
};

const classStatusConfig = {
    ONGOING: { label: 'Ongoing', color: 'bg-[#0A4D9F]/20 text-[#7BB2FF] border-[#0A4D9F]/35' },
    COMPLETED: { label: 'Completed', color: 'bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/35' },
    CANCELLED: { label: 'Cancelled', color: 'bg-[#8DA0BF]/15 text-[#8DA0BF] border-white/10' },
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

const StatusBadge = ({ status }) => {
    const cfg = statusConfig[status] || statusConfig.PENDING;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
            <Icon className="h-3 w-3" />
            {cfg.label}
        </span>
    );
};

const EmptyState = ({ icon: Icon, title, description, action }) => (
    <div className="text-center py-16">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#0E1620]">
            <Icon className="h-8 w-8 text-[#8DA0BF]" />
        </div>
        <h3 className="font-semibold text-[#DCE7F5]">{title}</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-[#8DA0BF]">{description}</p>
        {action && <div className="mt-4">{action}</div>}
    </div>
);

const Swaps = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('received');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [videoPreview, setVideoPreview] = useState(null); // { skillName, videoUrl, proofUrl }

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

    const pendingReceivedCount = receivedRequests.filter(r => r.status === 'PENDING').length;
    const pendingSentCount = sentRequests.filter(r => r.status === 'PENDING').length;
    const ongoingClassCount = activeClasses.filter(c => c.status === 'ONGOING').length;

    const tabs = [
        { key: 'received', label: 'Received', icon: Inbox, badge: pendingReceivedCount },
        { key: 'sent', label: 'Sent', icon: Send, badge: pendingSentCount },
        { key: 'classes', label: 'Classes', icon: Users, badge: ongoingClassCount },
    ];

    const renderRequestCard = (req, type) => {
        const isReceived = type === 'received';
        const otherUser = isReceived ? req.fromUser : req.toUser;
        const otherUsername = otherUser?.username || 'Unknown';

        return (
            <div key={req.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#111721] shadow-[0_16px_40px_rgba(0,0,0,0.55)] transition duration-200 hover:-translate-y-1 hover:bg-[#151D27]">
                <div className="p-5">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
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
                        </div>
                        <StatusBadge status={req.status} />
                    </div>

                    {/* Skills info */}
                    <div className="mt-4 flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 rounded-lg border border-[#22C55E]/25 bg-[#22C55E]/10 p-3">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-[#22C55E]">
                                    <BookOpen className="h-3.5 w-3.5" />
                                    {isReceived ? 'They want to learn' : 'You want to learn'}
                                </div>
                                {(req.learnSkill?.preview?.videoUrl || req.learnSkill?.proofUrl) && (
                                    <button
                                        onClick={() => setVideoPreview({
                                            skillName: req.learnSkill?.skill?.name,
                                            videoUrl: req.learnSkill?.preview?.videoUrl,
                                            proofUrl: req.learnSkill?.proofUrl
                                        })}
                                        className="flex items-center gap-1 text-xs font-medium text-[#22C55E] transition-colors hover:text-[#86efac]"
                                    >
                                        <Play className="h-3 w-3" />
                                        Preview
                                    </button>
                                )}
                            </div>
                            <p className="text-sm font-semibold text-[#DCE7F5]">{req.learnSkill?.skill?.name || 'Unknown skill'}</p>
                        </div>

                        {req.teachSkill?.skill?.name && (
                            <div className="flex-1 rounded-lg border border-[#0A4D9F]/25 bg-[#0A4D9F]/12 p-3">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-[#7BB2FF]">
                                        <GraduationCap className="h-3.5 w-3.5" />
                                        {isReceived ? 'They offer to teach' : 'You offer to teach'}
                                    </div>
                                    {(req.teachSkill?.preview?.videoUrl || req.teachSkill?.proofUrl) && (
                                        <button
                                            onClick={() => setVideoPreview({
                                                skillName: req.teachSkill?.skill?.name,
                                                videoUrl: req.teachSkill?.preview?.videoUrl,
                                                proofUrl: req.teachSkill?.proofUrl
                                            })}
                                            className="flex items-center gap-1 text-xs font-medium text-[#7BB2FF] transition-colors hover:text-[#9fc8ff]"
                                        >
                                            <Play className="h-3 w-3" />
                                            Preview
                                        </button>
                                    )}
                                </div>
                                <p className="text-sm font-semibold text-[#DCE7F5]">{req.teachSkill.skill.name}</p>
                            </div>
                        )}
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
                        <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/12 p-3">
                            <Ban className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]" />
                            <p className="text-sm text-[#EF4444]">Reason: {req.cancelReason}</p>
                        </div>
                    )}
                </div>

                {/* Actions footer */}
                {req.status === 'PENDING' && (
                    <div className="flex justify-end gap-2 border-t border-white/10 bg-[#0E1620] px-5 py-3">
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

                {/* View class link if accepted */}
                {req.status === 'ACCEPTED' && (
                    <div className="flex flex-wrap justify-end gap-2 border-t border-[#22C55E]/30 bg-[#22C55E]/10 px-5 py-3">
                        {req.swapClass && (
                            <Link to={`/swaps/${req.swapClass.id}`}>
                                <Button size="sm" variant="secondary">
                                    <ArrowRightLeft className="h-4 w-4 mr-1" />
                                    Go to Classroom
                                </Button>
                            </Link>
                        )}
                        {!isReceived && (
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
            </div>
        );
    };

    const renderClassCard = (cls) => {
        const fromUser = cls.swapRequest?.fromUser?.username || 'Unknown';
        const toUser = cls.swapRequest?.toUser?.username || 'Unknown';
        const partnerName = fromUser === user?.username ? toUser : fromUser;
        const learnSkillObj = cls.swapRequest?.learnSkill;
        const teachSkillObj = cls.swapRequest?.teachSkill;
        const learnSkill = learnSkillObj?.skill?.name || 'Unknown';
        const teachSkill = teachSkillObj?.skill?.name;
        const classCfg = classStatusConfig[cls.status] || classStatusConfig.ONGOING;
        const isCompleted = cls.completion?.completedAt;

        return (
            <div key={cls.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#111721] shadow-[0_16px_40px_rgba(0,0,0,0.55)] transition duration-200 hover:-translate-y-1 hover:bg-[#151D27]">
                <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
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
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${classCfg.color}`}>
                            {classCfg.label}
                        </span>
                    </div>

                    {/* Skills */}
                    <div className="mt-4 flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 rounded-lg border border-[#22C55E]/25 bg-[#22C55E]/10 p-3">
                            <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-[#22C55E]">
                                    <BookOpen className="h-3.5 w-3.5" /> Learning
                                </div>
                                {(learnSkillObj?.preview?.videoUrl || learnSkillObj?.proofUrl) && (
                                    <button
                                        onClick={() => setVideoPreview({
                                            skillName: learnSkill,
                                            videoUrl: learnSkillObj?.preview?.videoUrl,
                                            proofUrl: learnSkillObj?.proofUrl
                                        })}
                                        className="flex items-center gap-1 text-xs font-medium text-[#22C55E] transition-colors hover:text-[#86efac]"
                                    >
                                        <Play className="h-3 w-3" /> Preview
                                    </button>
                                )}
                            </div>
                            <p className="text-sm font-semibold text-[#DCE7F5]">{learnSkill}</p>
                        </div>
                        {teachSkill && (
                            <div className="flex-1 rounded-lg border border-[#0A4D9F]/25 bg-[#0A4D9F]/12 p-3">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-[#7BB2FF]">
                                        <GraduationCap className="h-3.5 w-3.5" /> Teaching
                                    </div>
                                    {(teachSkillObj?.preview?.videoUrl || teachSkillObj?.proofUrl) && (
                                        <button
                                            onClick={() => setVideoPreview({
                                                skillName: teachSkill,
                                                videoUrl: teachSkillObj?.preview?.videoUrl,
                                                proofUrl: teachSkillObj?.proofUrl
                                            })}
                                            className="flex items-center gap-1 text-xs font-medium text-[#7BB2FF] transition-colors hover:text-[#9fc8ff]"
                                        >
                                            <Play className="h-3 w-3" /> Preview
                                        </button>
                                    )}
                                </div>
                                <p className="text-sm font-semibold text-[#DCE7F5]">{teachSkill}</p>
                            </div>
                        )}
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
                </div>

                <div className="flex justify-end border-t border-white/10 bg-[#0E1620] px-5 py-3">
                    <Link to={`/swaps/${cls.id}`}>
                        <Button size="sm" variant="secondary">
                            <ArrowRightLeft className="h-4 w-4 mr-1" />
                            {cls.status === 'ONGOING' ? 'Enter Classroom' : 'View Details'}
                        </Button>
                    </Link>
                </div>
            </div>
        );
    };

    return (
        <div className="page-shell">
            {/* Video Preview Modal */}
            {videoPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setVideoPreview(null)}>
                    <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-[#111721] shadow-[0_16px_40px_rgba(0,0,0,0.55)]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-white/10 p-4">
                            <h3 className="font-semibold text-[#DCE7F5]">{videoPreview.skillName} - Preview</h3>
                            <button onClick={() => setVideoPreview(null)} className="rounded-full p-1 transition-colors hover:bg-[#151D27]">
                                <X className="h-5 w-5 text-[#8DA0BF]" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            {videoPreview.videoUrl ? (
                                <div>
                                    <p className="mb-2 text-xs font-medium text-[#8DA0BF]">Demo Video</p>
                                    <video src={videoPreview.videoUrl} controls className="w-full rounded-lg border border-white/10" />
                                </div>
                            ) : (
                                <div className="rounded-lg bg-[#0E1620] py-8 text-center">
                                    <Play className="mx-auto mb-2 h-10 w-10 text-[#6F83A3]" />
                                    <p className="text-sm text-[#8DA0BF]">No demo video available</p>
                                </div>
                            )}
                            {videoPreview.proofUrl && (
                                <a
                                    href={videoPreview.proofUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm font-medium text-[#7BB2FF] transition-colors hover:text-[#9fc8ff]"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    View Proof / Portfolio Link
                                </a>
                            )}
                            {!videoPreview.videoUrl && !videoPreview.proofUrl && (
                                <p className="text-center text-sm text-[#8DA0BF]">No preview content available for this skill.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={confirmDialog.open}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmLabel={
                    confirmDialog.action === 'ACCEPTED' ? 'Accept' : 'Reject'
                }
                variant={confirmDialog.action === 'ACCEPTED' ? 'primary' : 'danger'}
                onConfirm={handleConfirmAction}
                onCancel={() => setConfirmDialog({ open: false, requestId: null, action: '', title: '', message: '' })}
            />

            <InputDialog
                open={cancelDialog.open}
                title={`Cancel request to @${cancelDialog.targetUsername}`}
                placeholder="Enter cancellation reason (min 5 characters)"
                submitLabel="Cancel Request"
                onSubmit={handleCancelWithReason}
                onCancel={closeCancelDialog}
            />

            {/* Page header */}
            <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                    <h1 className="page-title">My Swaps</h1>
                    <p className="mt-0.5 text-sm text-[#8DA0BF]">Manage your skill swap requests and classrooms</p>
                </div>
                <Button onClick={() => navigate('/swaps/new')} className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Request
                </Button>
            </div>

            <div className="section-card p-0! overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-white/10 px-2 sm:px-4">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            className={clsx(
                                'flex items-center gap-2 px-4 py-3 font-medium text-sm focus:outline-none transition-colors relative',
                                activeTab === tab.key
                                    ? 'border-b-2 border-[#0A4D9F] text-[#DCE7F5]'
                                    : 'text-[#8DA0BF] hover:text-[#DCE7F5]'
                            )}
                            onClick={() => { setActiveTab(tab.key); setStatusFilter('ALL'); }}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                            {tab.badge > 0 && (
                                <span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-[#0A4D9F] px-1.5 text-xs font-bold text-white">
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Status filter (for request tabs only) */}
                {(activeTab === 'received' || activeTab === 'sent') && (
                    <div className="p-4 flex gap-2 flex-wrap">
                        {['ALL', 'PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'].map(status => {
                            const currentRequests = activeTab === 'received' ? receivedRequests : sentRequests;
                            const count = status === 'ALL' ? currentRequests.length : currentRequests.filter(r => r.status === status).length;
                            return (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={clsx(
                                        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                                        statusFilter === status
                                            ? 'border-[#0A4D9F] bg-[#0A4D9F] text-white'
                                            : 'border-white/10 bg-[#0E1620] text-[#8DA0BF] hover:border-white/20 hover:text-[#DCE7F5]'
                                    )}
                                >
                                    {status === 'ALL' ? 'All' : statusConfig[status]?.label || status} ({count})
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Content */}
            <div>
                {activeTab === 'received' && (
                    <div className="space-y-5">
                        {loadingReceived ? <ListItemSkeleton count={3} /> : (
                            filterRequests(receivedRequests).length === 0 ? (
                                <EmptyState
                                    icon={Inbox}
                                    title={statusFilter !== 'ALL' ? `No ${statusConfig[statusFilter]?.label.toLowerCase()} requests` : 'No requests received'}
                                    description={statusFilter !== 'ALL' ? 'Try changing the filter to see other requests.' : 'When someone sends you a swap request, it will appear here.'}
                                />
                            ) : (
                                filterRequests(receivedRequests).map(req => renderRequestCard(req, 'received'))
                            )
                        )}
                    </div>
                )}

                {activeTab === 'sent' && (
                    <div className="space-y-5">
                        {loadingSent ? <ListItemSkeleton count={3} /> : (
                            filterRequests(sentRequests).length === 0 ? (
                                <EmptyState
                                    icon={Send}
                                    title={statusFilter !== 'ALL' ? `No ${statusConfig[statusFilter]?.label.toLowerCase()} requests` : 'No requests sent'}
                                    description={statusFilter !== 'ALL' ? 'Try changing the filter to see other requests.' : 'Start by browsing skills and sending a swap request.'}
                                    action={statusFilter === 'ALL' && (
                                        <Button size="sm" onClick={() => navigate('/swaps/new')}>
                                            <Plus className="h-4 w-4 mr-1" />
                                            Send Your First Request
                                        </Button>
                                    )}
                                />
                            ) : (
                                filterRequests(sentRequests).map(req => renderRequestCard(req, 'sent'))
                            )
                        )}
                    </div>
                )}

                {activeTab === 'classes' && (
                    <div className="space-y-5">
                        {loadingClasses ? <ListItemSkeleton count={3} /> : (
                            activeClasses.length === 0 ? (
                                <EmptyState
                                    icon={Users}
                                    title="No classrooms yet"
                                    description="Once a swap request is accepted, a classroom will be created where you can collaborate."
                                />
                            ) : (
                                activeClasses.map(cls => renderClassCard(cls))
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Swaps;
