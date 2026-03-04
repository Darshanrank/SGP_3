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
    const [unreadCount, setUnreadCount] = useState(0);
    const reconnectAttempts = useRef(0);
    const MAX_RECONNECT_ATTEMPTS = 5;

    useEffect(() => {
        if (!user) {
            // Disconnect if logged out
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            reconnectAttempts.current = 0;
            return;
        }

        const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');
        const token = getToken();
        if (!token) return;

        const socket = io(socketUrl, {
            withCredentials: true,
            autoConnect: true,
            auth: { token },
            reconnection: true,
            reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 10000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[Socket] Connected for notifications', socket.id);
            reconnectAttempts.current = 0;
        });

        // Listen for real-time notifications
        socket.on('new_notification', (notification) => {
            setUnreadCount((c) => c + 1);
            toast(notification.message || 'New notification', {
                icon: '🔔',
                duration: 4000,
            });
        });

        // Listen for new chat messages (lightweight toast)
        socket.on('new_chat_message', (data) => {
            toast(`${data.senderName || 'Someone'}: ${data.preview}`, {
                icon: '💬',
                duration: 3000,
            });
        });

        socket.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
        });

        // Handle auth errors — refresh token and reconnect
        socket.on('connect_error', async (err) => {
            console.warn('[Socket] Connection error:', err.message);
            if (err.message === 'AUTH_INVALID' || err.message === 'AUTH_MISSING') {
                reconnectAttempts.current += 1;
                if (reconnectAttempts.current > MAX_RECONNECT_ATTEMPTS) {
                    console.warn('[Socket] Max reconnect attempts reached, giving up.');
                    socket.disconnect();
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
                        socket.auth = { token: newToken };
                        socket.connect();
                    }
                } catch (refreshErr) {
                    console.warn('[Socket] Token refresh failed, cannot reconnect:', refreshErr.message);
                }
            }
        });

        return () => {
            socket.off('new_notification');
            socket.off('new_chat_message');
            socket.off('connect_error');
            socket.disconnect();
            socketRef.current = null;
        };
    }, [user]);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, unreadCount, setUnreadCount }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
