import { useEffect, useState, useCallback } from 'react';
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
    const [unreadCount, setUnreadCount] = useState(0);
    const [activeFilter, setActiveFilter] = useState('ALL');
    const { socket, setUnreadCount: setGlobalUnread, setRecentNotifications, refreshNotificationState } = useSocket() || {};

    const syncUnreadCount = useCallback((updater) => {
        setUnreadCount((current) => {
            const next = typeof updater === 'function' ? updater(current) : updater;
            if (setGlobalUnread) setGlobalUnread(next);
            return next;
        });
    }, [setGlobalUnread]);

    const fetchNotifications = useCallback(async () => {
        try {
            const type = activeFilter === 'ALL' ? undefined : activeFilter;
            const data = await getNotifications({ page: 1, limit: 100, type });
            const items = Array.isArray(data) ? data : data?.data || [];
            setNotifications(items);
            setRecentNotifications?.(items.slice(0, 8));

            const countRes = await getUnreadCount();
            const count = countRes?.unread ?? 0;
            syncUnreadCount(count);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [activeFilter, setRecentNotifications, syncUnreadCount]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    useEffect(() => {
        if (!socket) return;
        const handleNew = () => {
            fetchNotifications();
        };
        socket.on('new_notification', handleNew);
        return () => socket.off('new_notification', handleNew);
    }, [socket, fetchNotifications]);

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

    const unreadNotifications = notifications.filter((n) => !n.isRead);
    const readNotifications = notifications.filter((n) => n.isRead);

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
                        onClick={() => setActiveFilter(filter.value)}
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
                        {unreadNotifications.map((notification) => (
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
                        {readNotifications.map((notification) => (
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
                </section>
            </div>
        </div>
    );
};

export default Notifications;
