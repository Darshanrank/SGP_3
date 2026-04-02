import clsx from 'clsx';
import { Button } from '../ui/Button';
import { Shield, RotateCcw } from 'lucide-react';

const SwapsControlPanel = ({
    tabs,
    activeTab,
    onTabChange,
    statusFilter,
    setStatusFilter,
    activeClasses,
    receivedRequests,
    sentRequests,
    statusConfig,
    blockedUsersCount,
    blockMenuOpen,
    setBlockMenuOpen,
    loadingBlockedUsers,
    blockedUsers,
    refetchBlockedUsers,
    safetyBusy,
    onUnblock,
    onLearnMore
}) => {
    return (
        <div className="section-card relative overflow-visible p-0!">
            <div className="flex border-b border-white/10 px-2 sm:px-4">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        className={clsx(
                            'relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors focus:outline-none',
                            activeTab === tab.key
                                ? 'border-b-2 border-[#0A4D9F] text-[#DCE7F5]'
                                : 'text-[#8DA0BF] hover:text-[#DCE7F5]'
                        )}
                        onClick={() => onTabChange(tab.key)}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                        {tab.badge > 0 && (
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0A4D9F] px-1.5 text-xs font-bold text-white">
                                {tab.badge}
                            </span>
                        )}
                    </button>
                ))}

                <div className="relative ml-auto self-center pr-1">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 rounded-lg border border-white/10 bg-[#0E1620] text-[#8DA0BF] hover:text-[#DCE7F5]"
                        onClick={() => setBlockMenuOpen((prev) => !prev)}
                    >
                        <Shield className="mr-1.5 h-3.5 w-3.5" />
                        Blocked Users
                        {blockedUsersCount > 0 && (
                            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0A4D9F] px-1.5 text-[10px] font-bold text-white">
                                {blockedUsersCount > 99 ? '99+' : blockedUsersCount}
                            </span>
                        )}
                    </Button>

                    {blockMenuOpen && (
                        <div className="absolute right-0 top-full z-30 mt-2 w-[24rem] overflow-hidden rounded-xl border border-white/10 bg-[#111721] shadow-[0_16px_40px_rgba(0,0,0,0.55)]">
                            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                                <p className="text-sm font-semibold text-[#DCE7F5]">Blocked Users</p>
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs text-[#8DA0BF] hover:text-[#DCE7F5]"
                                    onClick={() => refetchBlockedUsers()}
                                >
                                    <RotateCcw className="h-3 w-3" />
                                    Refresh
                                </button>
                            </div>

                            <div className="max-h-80 space-y-3 overflow-y-auto p-3">
                                {loadingBlockedUsers && (
                                    <p className="text-sm text-[#8DA0BF]">Loading blocked users...</p>
                                )}

                                {!loadingBlockedUsers && blockedUsersCount === 0 && (
                                    <div className="rounded-xl border border-white/10 bg-[#0F172A] p-6 text-center">
                                        <h4 className="text-lg font-medium text-white">No blocked users</h4>
                                        <p className="mt-2 text-sm text-gray-400">Users you block will appear here.</p>
                                        <button
                                            type="button"
                                            className="mt-4 rounded-lg border border-white/10 bg-[#111721] px-3 py-2 text-xs text-[#DCE7F5] transition hover:bg-[#151D27]"
                                            onClick={onLearnMore}
                                        >
                                            Learn More
                                        </button>
                                    </div>
                                )}

                                {!loadingBlockedUsers && blockedUsers.map((entry) => {
                                    const blocked = entry?.blockedUser;
                                    const blockedUserId = blocked?.userId || entry?.blockedUserId;
                                    const displayName = blocked?.profile?.fullName || blocked?.username || `User ${blockedUserId}`;
                                    const handle = blocked?.username ? `@${blocked.username}` : `#${blockedUserId}`;
                                    const blockedAt = entry?.createdAt
                                        ? new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                        : 'Unknown';
                                    const reason = entry?.reason || 'Manual block';

                                    return (
                                        <div key={entry.id || blockedUserId} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#0F172A] p-4">
                                            <div className="flex min-w-0 items-center gap-3">
                                                {blocked?.profile?.avatarUrl ? (
                                                    <img src={blocked.profile.avatarUrl} alt={displayName} className="h-10 w-10 shrink-0 rounded-full object-cover" />
                                                ) : (
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0A4D9F]/25 text-sm font-semibold text-[#DCE7F5]">
                                                        {(blocked?.username || 'U')[0].toUpperCase()}
                                                    </div>
                                                )}

                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium text-[#DCE7F5]">{displayName}</p>
                                                    <p className="truncate text-xs text-[#8DA0BF]">{handle}</p>
                                                    <p className="mt-1 text-xs text-[#8DA0BF]">Reason: {reason}</p>
                                                    <p className="text-xs text-[#8DA0BF]">Blocked on: {blockedAt}</p>
                                                </div>
                                            </div>

                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                                disabled={safetyBusy || !blockedUserId}
                                                onClick={() => onUnblock(blockedUserId, handle)}
                                            >
                                                Unblock
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap gap-2 p-4">
                {(activeTab === 'classes'
                    ? ['ALL', 'ONGOING', 'COMPLETED', 'CANCELLED']
                    : ['ALL', 'PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED']
                ).map((status) => {
                    const currentItems = activeTab === 'classes'
                        ? activeClasses
                        : activeTab === 'received'
                            ? receivedRequests
                            : sentRequests;
                    const count = status === 'ALL' ? currentItems.length : currentItems.filter((r) => r.status === status).length;

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
        </div>
    );
};

export default SwapsControlPanel;
