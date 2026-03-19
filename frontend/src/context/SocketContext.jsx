// src/context/SocketContext.jsx
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import io from 'socket.io-client';
import { toast } from 'react-hot-toast';
import api from '../services/api';

const SocketContext = createContext(null);

const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const socketRef = useRef(null);
    const [socket, setSocket] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [chatUnreadByClass, setChatUnreadByClass] = useState({});
    const reconnectAttempts = useRef(0);
    const MAX_RECONNECT_ATTEMPTS = 5;

    const clearChatUnread = (classId) => {
        if (!classId) return;
        const key = String(classId);
        setChatUnreadByClass((prev) => {
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    useEffect(() => {
        if (!user) {
            // Disconnect if logged out
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            setSocket(null);
            reconnectAttempts.current = 0;
            return;
        }

        const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');
        const token = getToken();
        if (!token) return;

        const socketInstance = io(socketUrl, {
            withCredentials: true,
            autoConnect: true,
            auth: { token },
            reconnection: true,
            reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 10000,
        });

        socketRef.current = socketInstance;
        setSocket(socketInstance);

        socketInstance.on('connect', () => {
            console.log('[Socket] Connected for notifications', socketInstance.id);
            reconnectAttempts.current = 0;
        });

        // Listen for real-time notifications
        socketInstance.on('new_notification', (notification) => {
            setUnreadCount((c) => c + 1);
            toast(notification.message || 'New notification', {
                icon: '🔔',
                duration: 4000,
            });
        });

        // Listen for new chat messages (lightweight toast)
        socketInstance.on('new_chat_message', (data) => {
            const classKey = String(data?.classId || '');
            if (classKey) {
                setChatUnreadByClass((prev) => ({
                    ...prev,
                    [classKey]: (prev[classKey] || 0) + 1
                }));
            }
            toast(`${data.senderName || 'Someone'}: ${data.preview}`, {
                icon: '💬',
                duration: 3000,
            });
        });

        socketInstance.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
        });

        // Handle auth errors — refresh token and reconnect
        socketInstance.on('connect_error', async (err) => {
            console.warn('[Socket] Connection error:', err.message);
            if (err.message === 'AUTH_INVALID' || err.message === 'AUTH_MISSING') {
                reconnectAttempts.current += 1;
                if (reconnectAttempts.current > MAX_RECONNECT_ATTEMPTS) {
                    console.warn('[Socket] Max reconnect attempts reached, giving up.');
                    socketInstance.disconnect();
                    return;
                }
                try {
                    // Attempt to refresh the access token
                    const res = await api.post('/auth/refresh');
                    const newToken = res.data?.accessToken;
                    if (newToken) {
                        const store = localStorage.getItem('token') ? localStorage : sessionStorage;
                        store.setItem('token', newToken);
                        // Update socket auth and reconnect
                        socketInstance.auth = { token: newToken };
                        socketInstance.connect();
                    }
                } catch (refreshErr) {
                    console.warn('[Socket] Token refresh failed, cannot reconnect:', refreshErr.message);
                }
            }
        });

        return () => {
            socketInstance.off('new_notification');
            socketInstance.off('new_chat_message');
            socketInstance.off('connect_error');
            socketInstance.disconnect();
            socketRef.current = null;
            setSocket(null);
            setChatUnreadByClass({});
        };
    }, [user]);

    return (
        <SocketContext.Provider value={{ socket, unreadCount, setUnreadCount, chatUnreadByClass, clearChatUnread }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
