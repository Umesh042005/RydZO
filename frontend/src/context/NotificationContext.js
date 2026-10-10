import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
// import { useSocket } from './SocketContext';
import toast from 'react-hot-toast';
import api from '../services/api';

const NotificationContext = createContext();

const NOTIFICATION_POLL_MS = 60 * 1000;

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    // const { socket } = useSocket();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = useCallback(async () => {
        try {
            if (!user) return;
            const response = await api.get('/api/notifications');
            setNotifications(response.data);
            setUnreadCount(response.data.filter(n => !n.isRead).length);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    }, [user]);

    // No sockets in this version: poll so owners see new requests without reloading.
    useEffect(() => {
        fetchNotifications();
        if (!user) return;
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') fetchNotifications();
        }, NOTIFICATION_POLL_MS);
        return () => clearInterval(interval);
    }, [fetchNotifications, user]);

    // Socket listening removed for clean version
    /*
    useEffect(() => {
        if (!socket || !user) return;
        // ... socket listeners removed
    }, [socket, user, fetchNotifications]);
    */

    const markAsRead = async (id) => {
        try {
            await api.put(`/api/notifications/${id}/read`);
            setNotifications(prev =>
                prev.map(n => (n._id === id ? { ...n, isRead: true } : n))
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.put('/api/notifications/mark-all-read');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            markAsRead,
            markAllAsRead,
            fetchNotifications
        }}>
            {children}
        </NotificationContext.Provider>
    );
};
