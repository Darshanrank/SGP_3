import { useState } from 'react';
import { getMyRequests, updateRequestStatus, getMyClasses } from '../services/swap.service';
import { Button } from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { ListItemSkeleton } from '../components/ui/Skeleton';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const Swaps = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('received');

    const { data: sentRequests = [], isLoading: loadingSent } = useQuery({
        queryKey: ['swaps', 'sent'],
        queryFn: async () => {
            const res = await getMyRequests('sent');
            return res?.data || res || [];
        },
        staleTime: 30000,
    });

    const { data: receivedRequests = [], isLoading: loadingReceived } = useQuery({
        queryKey: ['swaps', 'received'],
        queryFn: async () => {
            const res = await getMyRequests('received');
            return res?.data || res || [];
        },
        staleTime: 30000,
    });

    const { data: activeClasses = [], isLoading: loadingClasses } = useQuery({
        queryKey: ['swaps', 'classes'],
        queryFn: async () => {
            const res = await getMyClasses();
            return res?.data || res || [];
        },
        staleTime: 30000,
    });

    const loading = loadingSent || loadingReceived || loadingClasses;

    // Cancel dialog state
    const [cancelDialog, setCancelDialog] = useState({ open: false, requestId: null });

    const handleStatusUpdate = async (id, status) => {
        try {
            await updateRequestStatus(id, status);
            toast.success(`Request ${status.toLowerCase()}`);
            queryClient.invalidateQueries({ queryKey: ['swaps'] });
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const handleCancelRequest = (requestId) => {
        setCancelDialog({ open: true, requestId });
    };

    const confirmCancelRequest = async () => {
        const { requestId } = cancelDialog;
        setCancelDialog({ open: false, requestId: null });
        await handleStatusUpdate(requestId, 'CANCELLED');
    };

    return (
        <div className="space-y-6">
            <ConfirmDialog
                open={cancelDialog.open}
                title="Cancel Swap Request"
                message="Are you sure you want to cancel this swap request?"
                confirmLabel="Cancel Request"
                variant="danger"
                onConfirm={confirmCancelRequest}
                onCancel={() => setCancelDialog({ open: false, requestId: null })}
            />
            <h1 className="text-2xl font-bold text-gray-900">My Swaps</h1>
            
            <div className="flex border-b border-gray-200">
                <button
                    className={clsx("px-4 py-2 font-medium text-sm focus:outline-none", activeTab === 'received' ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700")}
                    onClick={() => setActiveTab('received')}
                >
                    Received Requests ({receivedRequests.filter(r => r.status === 'PENDING').length})
                </button>
                <button
                    className={clsx("px-4 py-2 font-medium text-sm focus:outline-none", activeTab === 'sent' ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700")}
                    onClick={() => setActiveTab('sent')}
                >
                    Sent Requests
                </button>
                 <button
                    className={clsx("px-4 py-2 font-medium text-sm focus:outline-none", activeTab === 'active' ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700")}
                    onClick={() => setActiveTab('active')}
                >
                    Active Classes ({activeClasses.length})
                </button>
            </div>

            <div className="mt-4">
                {activeTab === 'received' && (
                    <div className="space-y-4">
                        {loadingReceived ? <ListItemSkeleton count={3} /> : (
                            <>
                                {receivedRequests.length === 0 && <p className="text-gray-500">No requests received.</p>}
                                {receivedRequests.map(req => (
                                    <div key={req.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                        <div>
                                            <h4 className="font-bold">From: {req.fromUser?.username || 'Unknown'}</h4>
                                            <p className="text-sm text-gray-600">Skill: {req.learnSkill?.skill?.name || 'Skill not found'}</p>
                                            {req.message && <p className="text-sm mt-1 italic">"{req.message}"</p>}
                                            <div className="mt-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{req.status}</div>
                                        </div>
                                        {req.status === 'PENDING' && (
                                            <div className="mt-3 sm:mt-0 flex space-x-2">
                                                <Button size="sm" onClick={() => handleStatusUpdate(req.id, 'ACCEPTED')}>Accept</Button>
                                                <Button size="sm" variant="secondary" onClick={() => handleStatusUpdate(req.id, 'REJECTED')}>Reject</Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'sent' && (
                    <div className="space-y-4">
                        {loadingSent ? <ListItemSkeleton count={3} /> : (
                            <>
                                {sentRequests.length === 0 && <p className="text-gray-500">No requests sent.</p>}
                                {sentRequests.map(req => (
                                    <div key={req.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                        <div>
                                            <h4 className="font-bold">To: {req.toUser?.username || 'Unknown'}</h4>
                                            <p className="text-sm text-gray-600">Skill: {req.learnSkill?.skill?.name || 'Skill not found'}</p>
                                            <div className={`text-xs mt-2 font-semibold ${req.status === 'PENDING' ? 'text-yellow-600' : req.status === 'ACCEPTED' ? 'text-green-600' : req.status === 'CANCELLED' ? 'text-gray-500' : 'text-red-600'}`}>
                                                Status: {req.status}
                                            </div>
                                        </div>
                                        {req.status === 'PENDING' && (
                                            <div className="mt-3 sm:mt-0">
                                                <Button size="sm" variant="danger" onClick={() => handleCancelRequest(req.id)}>
                                                    Cancel
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'active' && (
                     <div className="space-y-4">
                        {loadingClasses ? <ListItemSkeleton count={3} /> : (
                            <>
                                {activeClasses.length === 0 && <p className="text-gray-500">No active classes.</p>}
                                {activeClasses.map(cls => (
                                    <div key={cls.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                                        <h4 className="font-bold">Swap #{cls.id}</h4>
                                        <p className="text-sm">Status: {cls.status}</p>
                                        <Link to={`/swaps/${cls.id}`}>
                                            <Button size="sm" variant="secondary" className="mt-2">View Class</Button>
                                        </Link>
                                    </div>
                                ))}
                            </>
                        )}
                     </div>
                )}
            </div>
        </div>
    );
};

export default Swaps;
