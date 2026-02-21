// src/services/chat.service.js
import api from './api';

export const getMessages = async (classId, page = 1, limit = 20) => {
    const response = await api.get(`/chat/${classId}?page=${page}&limit=${limit}`);
    return response.data; // Now returns { data: [], meta: {} }
};

export const sendMessage = async (classId, message) => {
    const response = await api.post(`/chat/${classId}`, { message });
    return response.data;
};
