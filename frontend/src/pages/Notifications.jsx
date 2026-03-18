// src/pages/Notifications.jsx
import { useEffect, useState, useCallback } from 'react';
import { getNotifications, markNotificationRead, markAllNotificationsRead, getUnreadCount } from '../services/meta.service';
import { Bell, Check } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useSocket } from '../context/SocketContext';

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const { socket, setUnreadCount: setGlobalUnread } = useSocket() || {};

    const fetchNotifications = useCallback(async () => {
        try {
            const data = await getNotifications();
            const items = Array.isArray(data) ? data : data?.data || [];
            setNotifications(items);
            const countRes = await getUnreadCount();
            const count = countRes?.unread ?? 0;
            setUnreadCount(count);
            if (setGlobalUnread) setGlobalUnread(count);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [setGlobalUnread]);

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
            setUnreadCount((c) => Math.max(0, c - 1));
        } catch (error) {
            console.error(error);
        }
    };

    const handleMarkAll = async () => {
        try {
            await markAllNotificationsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return <div className="section-card text-center">Loading...</div>;

    return (
        <div className="page-shell">
            <header className="flex justify-between items-center">
                <h1 className="page-title">Notifications</h1>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">Unread: {unreadCount}</span>
                    {notifications.length > 0 && (
                        <Button size="sm" variant="secondary" onClick={handleMarkAll}>Mark all read</Button>
                    )}
                </div>
            </header>

            <div className="section-card p-0! overflow-hidden">
                <ul role="list" className="divide-y divide-gray-200">
                    {notifications.length === 0 && (
                        <li className="px-4 py-8 text-center text-gray-500">
                            No notifications yet.
                        </li>
                    )}
                    {notifications.map((notification) => (
                        <li key={notification.id} className={`px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors ${notification.isRead ? 'opacity-60' : 'bg-blue-50'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="shrink-0">
                                        <Bell className={`h-6 w-6 ${notification.isRead ? 'text-gray-400' : 'text-blue-500'}`} />
                                    </div>
                                    <div className="ml-4">
                                        <p className={`text-sm font-medium ${notification.isRead ? 'text-gray-900' : 'text-blue-900 font-semibold'}`}>
                                            {notification.message}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {new Date(notification.createdAt).toLocaleDateString()} at {new Date(notification.createdAt).toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                                {!notification.isRead && (
                                    <Button size="sm" variant="ghost" onClick={() => handleMarkAsRead(notification.id)} title="Mark as read">
                                        <Check className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default Notifications;
