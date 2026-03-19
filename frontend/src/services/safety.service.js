import api from './api';

export const submitReport = async ({ reportedUserId, reason, description }) => {
    const payload = {
        reportedUserId,
        reason,
        ...(description ? { description } : {})
    };
    const response = await api.post('/reports', payload);
    return response.data;
};

export const getBlockStatus = async (userId) => {
    const response = await api.get(`/blocks/status/${userId}`);
    return response.data?.data || response.data;
};

export const blockUser = async (blockedUserId) => {
    const response = await api.post('/blocks', { blockedUserId });
    return response.data?.data || response.data;
};

export const unblockUser = async (userId) => {
    const response = await api.delete(`/blocks/${userId}`);
    return response.data?.data || response.data;
};

export const getMyBlockedUsers = async () => {
    const response = await api.get('/blocks/me');
    return response.data?.data || response.data;
};

export const getReports = async (page = 1, limit = 20, status) => {
    const params = new URLSearchParams({ page, limit });
    if (status) params.append('status', status);
    const response = await api.get(`/reports?${params.toString()}`);
    return response.data;
};

export const updateReportStatus = async (id, status) => {
    const response = await api.put(`/reports/${id}/status`, { status });
    return response.data;
};

export const moderateReportAction = async (id, action, reason) => {
    const response = await api.post(`/reports/${id}/action`, {
        action,
        ...(reason ? { reason } : {})
    });
    return response.data;
};
