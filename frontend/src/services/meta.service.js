// src/services/meta.service.js
import api from './api';

export const getNotifications = async () => {
    const response = await api.get('/meta/notifications');
    return response.data;
};

export const getUnreadCount = async () => {
    const response = await api.get('/meta/notifications/unread-count');
    return response.data;
};

export const markNotificationRead = async (id) => {
    await api.put(`/meta/notifications/${id}/read`);
};

export const markNotificationUnread = async (id) => {
    await api.put(`/meta/notifications/${id}/unread`);
};

export const markAllNotificationsRead = async () => {
    const response = await api.put('/meta/notifications/read-all');
    return response.data;
};

export const getDashboardStats = async () => {
    const response = await api.get('/meta/dashboard');
    return response.data;
};

export const getRewards = async () => {
    const response = await api.get('/meta/rewards');
    return response.data;
};

export const getBadges = async () => {
    const response = await api.get('/meta/badges');
    return response.data;
};

export const getMyBadges = async () => {
    const response = await api.get('/meta/badges/my');
    return response.data;
};

export const createBadge = async (data) => {
    const response = await api.post('/meta/badges', data);
    return response.data;
};

export const assignBadge = async (data) => {
    const response = await api.post('/meta/badges/assign', data);
    return response.data;
};

export const reportUser = async (data) => {
    const response = await api.post('/meta/report', data);
    return response.data;
};

export const getMyReports = async () => {
    const response = await api.get('/meta/reports/my');
    return response.data;
};

export const getReports = async (page = 1, limit = 20, status) => {
    const params = new URLSearchParams({ page, limit });
    if (status) params.append('status', status);
    const response = await api.get(`/meta/reports?${params.toString()}`);
    return response.data;
};

export const updateReportStatus = async (id, status) => {
    const response = await api.put(`/meta/reports/${id}`, { status });
    return response.data;
};

export const getCalendarEvents = async (page = 1, limit = 20, from, to) => {
    const params = new URLSearchParams({ page, limit });
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    const response = await api.get(`/meta/calendar?${params.toString()}`);
    return response.data;
};

export const createCalendarEvent = async (data) => {
    const response = await api.post('/meta/calendar', data);
    return response.data;
};

export const getPenalties = async (page = 1, limit = 20) => {
    const params = new URLSearchParams({ page, limit });
    const response = await api.get(`/meta/penalties?${params.toString()}`);
    return response.data;
};

export const getMyPenalties = async () => {
    const response = await api.get('/meta/penalties/my');
    return response.data;
};

export const createPenalty = async (data) => {
    const response = await api.post('/meta/penalties', data);
    return response.data;
};

export const getLeaderboard = async (page = 1, limit = 20) => {
    const response = await api.get(`/meta/leaderboard?page=${page}&limit=${limit}`);
    return response.data;
};

export const getSkillCategories = async () => {
    const response = await api.get('/meta/skill-categories');
    return response.data;
};
