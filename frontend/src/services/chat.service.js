// src/services/chat.service.js
import api from './api';

export const getMessages = async (classId, { cursor, limit = 20 } = {}) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.append('cursor', cursor);
    const response = await api.get(`/chat/${classId}/messages?${params.toString()}`);
    return response.data;
};

export const sendMessage = async (classId, message) => {
    const response = await api.post(`/chat/${classId}/messages`, { message });
    return response.data;
};

export const sendAttachmentMessage = async (classId, file, message = '') => {
    const formData = new FormData();
    formData.append('attachment', file);
    if (message) formData.append('message', message);

    const response = await api.post(`/chat/${classId}/attachments`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

export const searchMessages = async (classId, q, limit = 50) => {
    const params = new URLSearchParams({ q, limit: String(limit) });
    const response = await api.get(`/chat/${classId}/search?${params.toString()}`);
    return response.data;
};
