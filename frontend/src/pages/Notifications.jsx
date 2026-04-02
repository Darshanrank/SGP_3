import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    getNotifications,
    markNotificationRead,
    markNotificationUnread,
    markAllNotificationsRead,
    getUnreadCount,
    deleteNotification,
    clearNotifications
} from '../services/meta.service';
import { Bell, Check, RotateCcw, Trash2, Settings2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useSocket } from '../context/SocketContext';

const PAGE_SIZE = 30;

const filters = [
    { label: 'All', value: 'ALL' },
    { label: 'Requests', value: 'SWAP_REQUEST' },
    { label: 'Chat', value: 'CHAT_MESSAGE' },
    { label: 'Classes', value: 'CLASS_REMINDER' },
    { label: 'System', value: 'SYSTEM' }
];

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const { socket, setUnreadCount: setGlobalUnread, setRecentNotifications, refreshNotificationState } = useSocket() || {};

    const syncUnreadCount = useCallback((updater) => {
        setUnreadCount((current) => {
            const next = typeof updater === 'function' ? updater(current) : updater;
            if (setGlobalUnread) setGlobalUnread(next);
            return next;
        });
    }, [setGlobalUnread]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery.trim());
        }, 250);

        return () => clearTimeout(timeout);
    }, [searchQuery]);

    const fetchNotifications = useCallback(async ({ page = 1, reset = false } = {}) => {
        const setLoadingState = reset ? setLoading : setLoadingMore;
        try {
            setLoadingState(true);
            const type = activeFilter === 'ALL' ? undefined : activeFilter;
            const response = await getNotifications({
                page,
                limit: PAGE_SIZE,
                type,
                q: debouncedSearchQuery || undefined,
                fromDate: fromDate || undefined,
                toDate: toDate || undefined
            });
            const items = Array.isArray(response) ? response : response?.data || [];
            const meta = response?.meta || {};

            setNotifications((prev) => {
                if (reset) return items;

                const existingIds = new Set(prev.map((n) => n.id));
                const deduped = items.filter((n) => !existingIds.has(n.id));
                return [...prev, ...deduped];
            });

            const resolvedPage = Number(meta.page || page || 1);
            const resolvedTotalPages = Number(meta.totalPages || 1);
            const resolvedTotal = Number(meta.total || 0);

            setCurrentPage(resolvedPage);
            setTotalCount(resolvedTotal);
            setHasMore(resolvedPage < resolvedTotalPages);

            const countRes = await getUnreadCount();
            const count = countRes?.unread ?? 0;
            syncUnreadCount(count);

            if (reset) {
                const latestItems = Array.isArray(items) ? items : [];
                setRecentNotifications?.(latestItems.slice(0, 8));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingState(false);
        }
    }, [activeFilter, debouncedSearchQuery, fromDate, toDate, setRecentNotifications, syncUnreadCount]);

    useEffect(() => {
        fetchNotifications({ page: 1, reset: true });
    }, [fetchNotifications]);

    useEffect(() => {
        if (!socket) return;
        const handleNew = () => {
            fetchNotifications({ page: 1, reset: true });
        };
        socket.on('new_notification', handleNew);
        return () => socket.off('new_notification', handleNew);
    }, [socket, fetchNotifications]);

    const handleLoadMore = async () => {
        if (!hasMore || loadingMore) return;
        await fetchNotifications({ page: currentPage + 1, reset: false });
    };

    const handleMarkAsRead = async (id) => {
        try {
            await markNotificationRead(id);
            setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
            syncUnreadCount((c) => Math.max(0, c - 1));
            await refreshNotificationState?.();
        } catch (error) {
            console.error(error);
        }
    };

    const handleMarkAsUnread = async (id) => {
        try {
            await markNotificationUnread(id);
            setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: false } : n));
            syncUnreadCount((c) => c + 1);
            await refreshNotificationState?.();
        } catch (error) {
            console.error(error);
        }
    };

    const handleMarkAll = async () => {
        try {
            await markAllNotificationsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            syncUnreadCount(0);
            await refreshNotificationState?.();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteNotification = async (id) => {
        try {
            const target = notifications.find((n) => n.id === id);
            await deleteNotification(id);
            setNotifications((prev) => prev.filter((n) => n.id !== id));
            if (target && !target.isRead) {
                syncUnreadCount((c) => Math.max(0, c - 1));
            }
            await refreshNotificationState?.();
        } catch (error) {
            console.error(error);
        }
    };

    const handleClearAll = async () => {
        try {
            await clearNotifications();
            setNotifications([]);
            syncUnreadCount(0);
            await refreshNotificationState?.();
        } catch (error) {
            console.error(error);
        }
    };

    const handleClearLocalFilters = () => {
        setSearchQuery('');
        setFromDate('');
        setToDate('');
    };

    const hasActiveFilters = useMemo(() => {
        return activeFilter !== 'ALL' || Boolean(searchQuery.trim()) || Boolean(fromDate) || Boolean(toDate);
    }, [activeFilter, searchQuery, fromDate, toDate]);

    const handleResetAllFilters = () => {
        setActiveFilter('ALL');
        handleClearLocalFilters();
    };

    const getDateBucket = (value) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Earlier';

        const now = new Date();
        const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startTomorrow = new Date(startToday);
        startTomorrow.setDate(startTomorrow.getDate() + 1);

        if (date >= startToday && date < startTomorrow) return 'Today';

        const sevenDaysAgo = new Date(startToday);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        if (date >= sevenDaysAgo) return 'Last 7 Days';

        return 'Earlier';
    };

    const groupNotificationsByDate = (items) => {
        const groups = {
            Today: [],
            'Last 7 Days': [],
            Earlier: []
        };

        items.forEach((item) => {
            groups[getDateBucket(item.createdAt)].push(item);
        });

        return [
            { key: 'today', title: 'Today', items: groups.Today },
            { key: 'last-7-days', title: 'Last 7 Days', items: groups['Last 7 Days'] },
            { key: 'earlier', title: 'Earlier', items: groups.Earlier }
        ].filter((group) => group.items.length > 0);
    };

    const unreadNotifications = useMemo(() => notifications.filter((n) => !n.isRead), [notifications]);
    const readNotifications = useMemo(() => notifications.filter((n) => n.isRead), [notifications]);
    const unreadGrouped = useMemo(() => groupNotificationsByDate(unreadNotifications), [unreadNotifications]);
    const readGrouped = useMemo(() => groupNotificationsByDate(readNotifications), [readNotifications]);

    if (loading) return <div className="section-card text-center">Loading...</div>;

    return (
        <div className="page-shell">
            <header className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="page-title">Notifications</h1>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-[#8DA0BF]">Unread: {unreadCount}</span>
                    <Link
                        to="/settings/notifications"
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[#DCE7F5] hover:bg-[#151D27]"
                    >
                        <Settings2 className="h-3.5 w-3.5" />
                        Notification Settings
                    </Link>
                    {notifications.length > 0 && (
                        <Button size="sm" variant="secondary" onClick={handleClearAll}>
                            Clear all
                        </Button>
                    )}
                    {unreadNotifications.length > 0 && (
                        <Button size="sm" variant="secondary" onClick={handleMarkAll}>Mark all read</Button>
                    )}
                </div>
            </header>

            <div className="flex flex-wrap items-center gap-2">
                {filters.map((filter) => (
                    <button
                        key={filter.value}
                        type="button"
                        onClick={() => {
                            if (activeFilter === filter.value) return;
                            setActiveFilter(filter.value);
                        }}
                        className={`rounded-full px-3 py-1 text-xs transition-colors ${
                            activeFilter === filter.value
                                ? 'bg-[#0A4D9F] text-white'
                                : 'bg-[#151D27] text-[#8DA0BF] hover:text-[#DCE7F5]'
                        }`}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            <section className="rounded-xl border border-white/10 bg-[#111721] p-4">
                <div className="grid gap-3 md:grid-cols-4">
                    <div className="md:col-span-2">
                        <label htmlFor="notification-search" className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">
                            Search notifications
                        </label>
                        <input
                            id="notification-search"
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by message or type"
                            className="w-full rounded-lg border border-white/10 bg-[#0E1620] px-3 py-2 text-sm text-[#DCE7F5]"
                        />
                    </div>

                    <div>
                        <label htmlFor="notifications-from-date" className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">
                            From date
                        </label>
                        <input
                            id="notifications-from-date"
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-[#0E1620] px-3 py-2 text-sm text-[#DCE7F5]"
                        />
                    </div>

                    <div>
                        <label htmlFor="notifications-to-date" className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">
                            To date
                        </label>
                        <input
                            id="notifications-to-date"
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-[#0E1620] px-3 py-2 text-sm text-[#DCE7F5]"
                        />
                    </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-xs text-[#8DA0BF]">Notifications are grouped by date: Today, Last 7 Days, Earlier.</p>
                    <Button size="sm" variant="ghost" onClick={handleClearLocalFilters}>
                        Clear filters
                    </Button>
                </div>
            </section>

            <div className="text-xs text-[#8DA0BF]">
                Showing {notifications.length} loaded notifications of {totalCount} matching results.
            </div>

            {notifications.length === 0 && (
                <section className="section-card text-center">
                    <h2 className="text-lg font-semibold text-[#DCE7F5]">
                        {hasActiveFilters ? 'No notifications match your filters.' : 'You are all caught up.'}
                    </h2>
                    <p className="mt-2 text-sm text-[#8DA0BF]">
                        {hasActiveFilters
                            ? 'Try broadening your search or removing date/type filters to see more activity.'
                            : 'Start a new swap or discover partners to generate activity notifications.'}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                        {hasActiveFilters ? (
                            <Button size="sm" variant="secondary" onClick={handleResetAllFilters}>
                                Clear filters
                            </Button>
                        ) : (
                            <Link to="/discover?sort=best-match&rating=4">
                                <Button size="sm" variant="secondary">Find Partners</Button>
                            </Link>
                        )}
                        <Link to="/swaps">
                            <Button size="sm" variant="secondary">Open Swaps</Button>
                        </Link>
                        <Link to="/settings/notifications">
                            <Button size="sm" variant="ghost">Notification Settings</Button>
                        </Link>
                    </div>
                </section>
            )}

            {notifications.length > 0 && (
                <div className="grid gap-6 lg:grid-cols-2">
                <section className="section-card overflow-hidden p-0!">
                    <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 sm:px-6">
                        <h2 className="text-base font-semibold text-[#DCE7F5]">Unread</h2>
                        <span className="rounded-full bg-[#0A4D9F]/20 px-2.5 py-1 text-xs font-medium text-[#7BB2FF]">
                            {unreadNotifications.length}
                        </span>
                    </div>
                    <ul role="list" className="divide-y divide-white/5">
                        {unreadNotifications.length === 0 && (
                            <li className="px-4 py-8 text-center text-[#8DA0BF]">No unread notifications.</li>
                        )}
                        {unreadGrouped.map((group) => (
                            <li key={group.key}>
                                <div className="border-b border-white/5 bg-[#0E1620] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#8DA0BF] sm:px-6">
                                    {group.title}
                                </div>
                                <ul role="list" className="divide-y divide-white/5">
                                    {group.items.map((notification) => (
                                        <li key={notification.id} className="bg-[#0A4D9F]/18 px-4 py-4 transition-colors hover:bg-[#0A4D9F]/25 sm:px-6">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center">
                                                    <div className="shrink-0">
                                                        <Bell className="h-6 w-6 text-[#7BB2FF]" />
                                                    </div>
                                                    <div className="ml-4">
                                                        <p className="text-sm font-semibold text-[#DCE7F5]">{notification.message}</p>
                                                        <p className="mt-1 text-xs text-[#8DA0BF]">
                                                            {new Date(notification.createdAt).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Button size="sm" variant="ghost" onClick={() => handleMarkAsRead(notification.id)} title="Mark as read">
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => handleDeleteNotification(notification.id)} title="Delete">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="section-card overflow-hidden p-0!">
                    <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 sm:px-6">
                        <h2 className="text-base font-semibold text-[#DCE7F5]">Read</h2>
                        <span className="rounded-full bg-[#151D27] px-2.5 py-1 text-xs font-medium text-[#8DA0BF]">
                            {readNotifications.length}
                        </span>
                    </div>
                    <ul role="list" className="divide-y divide-white/5">
                        {readNotifications.length === 0 && (
                            <li className="px-4 py-8 text-center text-[#8DA0BF]">No read notifications yet.</li>
                        )}
                        {readGrouped.map((group) => (
                            <li key={group.key}>
                                <div className="border-b border-white/5 bg-[#0E1620] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#8DA0BF] sm:px-6">
                                    {group.title}
                                </div>
                                <ul role="list" className="divide-y divide-white/5">
                                    {group.items.map((notification) => (
                                        <li key={notification.id} className="px-4 py-4 opacity-80 transition-colors hover:bg-[#151D27] sm:px-6">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center">
                                                    <div className="shrink-0">
                                                        <Bell className="h-6 w-6 text-[#8DA0BF]" />
                                                    </div>
                                                    <div className="ml-4">
                                                        <p className="text-sm font-medium text-[#DCE7F5]">{notification.message}</p>
                                                        <p className="mt-1 text-xs text-[#8DA0BF]">
                                                            {new Date(notification.createdAt).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Button size="sm" variant="ghost" onClick={() => handleMarkAsUnread(notification.id)} title="Mark as unread">
                                                        <RotateCcw className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => handleDeleteNotification(notification.id)} title="Delete">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        ))}
                    </ul>
                </section>
                </div>
            )}

            {notifications.length > 0 && (
                <div className="flex justify-center">
                    {hasMore ? (
                        <Button size="sm" variant="secondary" onClick={handleLoadMore} disabled={loadingMore}>
                            {loadingMore ? 'Loading older notifications...' : 'Load older notifications'}
                        </Button>
                    ) : (
                        <p className="text-xs text-[#8DA0BF]">You have reached the end of your notification history.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default Notifications;
