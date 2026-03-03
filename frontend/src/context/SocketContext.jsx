// src/context/SocketContext.jsx
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import io from 'socket.io-client';
import { toast } from 'react-hot-toast';

const SocketContext = createContext(null);

const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const socketRef = useRef(null);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user) {
            // Disconnect if logged out
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            return;
        }

        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) return;

        const socket = io(socketUrl, {
            withCredentials: true,
            autoConnect: true,
            auth: { token },
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[Socket] Connected for notifications', socket.id);
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

        socket.on('disconnect', () => {
            console.log('[Socket] Disconnected');
        });

        return () => {
            socket.off('new_notification');
            socket.off('new_chat_message');
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
