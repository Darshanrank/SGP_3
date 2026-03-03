// src/services/matching.service.js
import api from './api';

export const getMatchedUsers = async (page = 1, limit = 10) => {
    const response = await api.get(`/matching?page=${page}&limit=${limit}`);
    return response.data;
};
