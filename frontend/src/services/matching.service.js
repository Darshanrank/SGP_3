// src/services/matching.service.js
import api from './api';

export const getMatchedUsers = async (page = 1, limit = 10) => {
    const response = await api.get(`/matching?page=${page}&limit=${limit}`);
    return response.data;
};

export const discoverUsers = async (params = {}) => {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        if (Array.isArray(value)) {
            if (value.length) query.set(key, value.join(','));
            return;
        }
        query.set(key, String(value));
    });

    const response = await api.get(`/discover?${query.toString()}`);
    return response.data;
};

export const getSavedDiscoveryFilters = async () => {
    const response = await api.get('/discover/filters');
    return response.data;
};

export const createSavedDiscoveryFilter = async (payload) => {
    const response = await api.post('/discover/filters', payload);
    return response.data;
};

export const deleteSavedDiscoveryFilter = async (id) => {
    const response = await api.delete(`/discover/filters/${id}`);
    return response.data;
};
