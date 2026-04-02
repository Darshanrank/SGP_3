const statusConfig = {
    PENDING: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
    ACCEPTED: { label: 'Accepted', color: 'bg-green-500/10 text-green-400 border-green-500/30' },
    REJECTED: { label: 'Rejected', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
    COMPLETED: { label: 'Completed', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
    CANCELLED: { label: 'Cancelled', color: 'bg-gray-500/10 text-gray-400 border-gray-500/30' }
};

const StatusBadge = ({ status }) => {
    const cfg = statusConfig[status] || statusConfig.PENDING;
    return (
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${cfg.color}`}>
            {cfg.label}
        </span>
    );
};

export default StatusBadge;
