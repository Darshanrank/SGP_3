import { useState } from 'react';
import { getMyRequests, updateRequestStatus, getMyClasses } from '../services/swap.service';
import { Button } from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { ListItemSkeleton } from '../components/ui/Skeleton';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft, Clock, CheckCircle, XCircle, Ban, MessageSquare, BookOpen, GraduationCap, Plus, Inbox, Send, Users, Play, X, ExternalLink } from 'lucide-react';

const statusConfig = {
    PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
    ACCEPTED: { label: 'Accepted', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
    REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
    CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: Ban },
};

const classStatusConfig = {
    ONGOING: { label: 'Ongoing', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-800 border-green-200' },
    CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600 border-gray-200' },
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
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <Icon className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">{description}</p>
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

    const openConfirm = (requestId, action, title, message) => {
        setConfirmDialog({ open: true, requestId, action, title, message });
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
            <div key={req.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="p-5">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                                {otherUsername[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Link to={`/u/${otherUsername}`} className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                                        {otherUsername}
                                    </Link>
                                    <span className="text-xs text-gray-400">{isReceived ? 'sent you a request' : 'received your request'}</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">{timeAgo(req.createdAt)}</p>
                            </div>
                        </div>
                        <StatusBadge status={req.status} />
                    </div>

                    {/* Skills info */}
                    <div className="mt-4 flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 bg-green-50 rounded-lg p-3 border border-green-100">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-green-700">
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
                                        className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium transition-colors"
                                    >
                                        <Play className="h-3 w-3" />
                                        Preview
                                    </button>
                                )}
                            </div>
                            <p className="font-semibold text-gray-900 text-sm">{req.learnSkill?.skill?.name || 'Unknown skill'}</p>
                        </div>

                        {req.teachSkill?.skill?.name && (
                            <div className="flex-1 bg-blue-50 rounded-lg p-3 border border-blue-100">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700">
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
                                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                                        >
                                            <Play className="h-3 w-3" />
                                            Preview
                                        </button>
                                    )}
                                </div>
                                <p className="font-semibold text-gray-900 text-sm">{req.teachSkill.skill.name}</p>
                            </div>
                        )}
                    </div>

                    {/* Message */}
                    {req.message && (
                        <div className="mt-3 flex items-start gap-2 bg-gray-50 rounded-lg p-3 border border-gray-100">
                            <MessageSquare className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                            <p className="text-sm text-gray-600 italic">&ldquo;{req.message}&rdquo;</p>
                        </div>
                    )}

                    {/* Cancel reason */}
                    {req.cancelReason && (
                        <div className="mt-3 flex items-start gap-2 bg-red-50 rounded-lg p-3 border border-red-100">
                            <Ban className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-600">Reason: {req.cancelReason}</p>
                        </div>
                    )}
                </div>

                {/* Actions footer */}
                {req.status === 'PENDING' && (
                    <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
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
                                onClick={() => openConfirm(req.id, 'CANCELLED', 'Cancel Request', `Are you sure you want to cancel your swap request to @${otherUsername}?`)}
                            >
                                <Ban className="h-4 w-4 mr-1" />
                                Cancel Request
                            </Button>
                        )}
                    </div>
                )}

                {/* View class link if accepted */}
                {req.status === 'ACCEPTED' && req.swapClass && (
                    <div className="px-5 py-3 bg-green-50 border-t border-green-100 flex justify-end">
                        <Link to={`/swaps/${req.swapClass.id}`}>
                            <Button size="sm" variant="secondary">
                                <ArrowRightLeft className="h-4 w-4 mr-1" />
                                Go to Classroom
                            </Button>
                        </Link>
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
            <div key={cls.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm shrink-0">
                                {partnerName[0].toUpperCase()}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <Link to={`/u/${partnerName}`} className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                                        {partnerName}
                                    </Link>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">Swap #{cls.id}</p>
                            </div>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${classCfg.color}`}>
                            {classCfg.label}
                        </span>
                    </div>

                    {/* Skills */}
                    <div className="mt-4 flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 bg-green-50 rounded-lg p-3 border border-green-100">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-green-700">
                                    <BookOpen className="h-3.5 w-3.5" /> Learning
                                </div>
                                {(learnSkillObj?.preview?.videoUrl || learnSkillObj?.proofUrl) && (
                                    <button
                                        onClick={() => setVideoPreview({
                                            skillName: learnSkill,
                                            videoUrl: learnSkillObj?.preview?.videoUrl,
                                            proofUrl: learnSkillObj?.proofUrl
                                        })}
                                        className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium transition-colors"
                                    >
                                        <Play className="h-3 w-3" /> Preview
                                    </button>
                                )}
                            </div>
                            <p className="font-semibold text-gray-900 text-sm">{learnSkill}</p>
                        </div>
                        {teachSkill && (
                            <div className="flex-1 bg-blue-50 rounded-lg p-3 border border-blue-100">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700">
                                        <GraduationCap className="h-3.5 w-3.5" /> Teaching
                                    </div>
                                    {(teachSkillObj?.preview?.videoUrl || teachSkillObj?.proofUrl) && (
                                        <button
                                            onClick={() => setVideoPreview({
                                                skillName: teachSkill,
                                                videoUrl: teachSkillObj?.preview?.videoUrl,
                                                proofUrl: teachSkillObj?.proofUrl
                                            })}
                                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                                        >
                                            <Play className="h-3 w-3" /> Preview
                                        </button>
                                    )}
                                </div>
                                <p className="font-semibold text-gray-900 text-sm">{teachSkill}</p>
                            </div>
                        )}
                    </div>

                    {/* Completion progress */}
                    {cls.status === 'ONGOING' && cls.completion && (
                        <div className="mt-3 bg-yellow-50 rounded-lg p-3 border border-yellow-100">
                            <p className="text-xs font-medium text-yellow-700">
                                Completion: {[cls.completion.completedByUser1, cls.completion.completedByUser2].filter(Boolean).length}/2 users marked complete
                            </p>
                        </div>
                    )}

                    {isCompleted && (
                        <div className="mt-3 bg-green-50 rounded-lg p-3 border border-green-100">
                            <p className="text-xs font-medium text-green-700">
                                Completed on {new Date(cls.completion.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                        </div>
                    )}
                </div>

                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
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
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Video Preview Modal */}
            {videoPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setVideoPreview(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <h3 className="font-semibold text-gray-900">{videoPreview.skillName} - Preview</h3>
                            <button onClick={() => setVideoPreview(null)} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            {videoPreview.videoUrl ? (
                                <div>
                                    <p className="text-xs font-medium text-gray-500 mb-2">Demo Video</p>
                                    <video src={videoPreview.videoUrl} controls className="w-full rounded-lg border border-gray-200" />
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-gray-50 rounded-lg">
                                    <Play className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                                    <p className="text-sm text-gray-400">No demo video available</p>
                                </div>
                            )}
                            {videoPreview.proofUrl && (
                                <a
                                    href={videoPreview.proofUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    View Proof / Portfolio Link
                                </a>
                            )}
                            {!videoPreview.videoUrl && !videoPreview.proofUrl && (
                                <p className="text-center text-sm text-gray-400">No preview content available for this skill.</p>
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
                    confirmDialog.action === 'ACCEPTED' ? 'Accept' :
                    confirmDialog.action === 'REJECTED' ? 'Reject' :
                    'Cancel Request'
                }
                variant={confirmDialog.action === 'ACCEPTED' ? 'primary' : 'danger'}
                onConfirm={handleConfirmAction}
                onCancel={() => setConfirmDialog({ open: false, requestId: null, action: '', title: '', message: '' })}
            />

            {/* Page header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Swaps</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Manage your skill swap requests and classrooms</p>
                </div>
                <Button onClick={() => navigate('/swaps/new')} className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Request
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        className={clsx(
                            'flex items-center gap-2 px-4 py-3 font-medium text-sm focus:outline-none transition-colors relative',
                            activeTab === tab.key
                                ? 'border-b-2 border-blue-500 text-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                        )}
                        onClick={() => { setActiveTab(tab.key); setStatusFilter('ALL'); }}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                        {tab.badge > 0 && (
                            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-bold bg-blue-600 text-white">
                                {tab.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Status filter (for request tabs only) */}
            {(activeTab === 'received' || activeTab === 'sent') && (
                <div className="flex gap-2 flex-wrap">
                    {['ALL', 'PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'].map(status => {
                        const currentRequests = activeTab === 'received' ? receivedRequests : sentRequests;
                        const count = status === 'ALL' ? currentRequests.length : currentRequests.filter(r => r.status === status).length;
                        return (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={clsx(
                                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                                    statusFilter === status
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                )}
                            >
                                {status === 'ALL' ? 'All' : statusConfig[status]?.label || status} ({count})
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Content */}
            <div>
                {activeTab === 'received' && (
                    <div className="space-y-4">
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
                    <div className="space-y-4">
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
                    <div className="space-y-4">
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
