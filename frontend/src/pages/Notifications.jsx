// src/pages/Notifications.jsx
import { useEffect, useState, useCallback } from 'react';
import { getNotifications, markNotificationRead, markNotificationUnread, markAllNotificationsRead, getUnreadCount } from '../services/meta.service';
import { Bell, Check, RotateCcw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useSocket } from '../context/SocketContext';

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const { socket, setUnreadCount: setGlobalUnread } = useSocket() || {};

    const syncUnreadCount = useCallback((updater) => {
        setUnreadCount((current) => {
            const next = typeof updater === 'function' ? updater(current) : updater;
            if (setGlobalUnread) setGlobalUnread(next);
            return next;
        });
    }, [setGlobalUnread]);

    const fetchNotifications = useCallback(async () => {
        try {
            const data = await getNotifications();
            const items = Array.isArray(data) ? data : data?.data || [];
            setNotifications(items);
            const countRes = await getUnreadCount();
            const count = countRes?.unread ?? 0;
            syncUnreadCount(count);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [syncUnreadCount]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Listen for real-time new notifications and refresh the list
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
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            syncUnreadCount((c) => Math.max(0, c - 1));
        } catch (error) {
            console.error(error);
        }
    };

    const handleMarkAsUnread = async (id) => {
        try {
            await markNotificationUnread(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: false } : n));
            syncUnreadCount((c) => c + 1);
        } catch (error) {
            console.error(error);
        }
    };

    const handleMarkAll = async () => {
        try {
            await markAllNotificationsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            syncUnreadCount(0);
        } catch (error) {
            console.error(error);
        }
    };

    const unreadNotifications = notifications.filter((n) => !n.isRead);
    const readNotifications = notifications.filter((n) => n.isRead);

    if (loading) return <div className="section-card text-center">Loading...</div>;

    return (
        <div className="page-shell">
            <header className="flex justify-between items-center">
                <h1 className="page-title">Notifications</h1>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-[#8DA0BF]">Unread: {unreadCount}</span>
                    {unreadNotifications.length > 0 && (
                        <Button size="sm" variant="secondary" onClick={handleMarkAll}>Mark all read</Button>
                    )}
                </div>
            </header>

            <div className="grid gap-6 lg:grid-cols-2">
                <section className="section-card p-0! overflow-hidden">
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
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="shrink-0">
                                            <Bell className="h-6 w-6 text-[#7BB2FF]" />
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-sm font-semibold text-[#DCE7F5]">{notification.message}</p>
                                            <p className="mt-1 text-xs text-[#8DA0BF]">
                                                {new Date(notification.createdAt).toLocaleDateString()} at {new Date(notification.createdAt).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="ghost" onClick={() => handleMarkAsRead(notification.id)} title="Mark as read">
                                        <Check className="h-4 w-4" />
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="section-card p-0! overflow-hidden">
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
                                                {new Date(notification.createdAt).toLocaleDateString()} at {new Date(notification.createdAt).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="ghost" onClick={() => handleMarkAsUnread(notification.id)} title="Mark as unread">
                                        <RotateCcw className="h-4 w-4" />
                                    </Button>
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
