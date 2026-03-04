// src/services/skill.service.js
import api from './api';

export const getAllSkills = async (page = 1, limit = 20, search = '', category = '') => {
    const params = new URLSearchParams({ page, limit });
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    const response = await api.get(`/skills?${params.toString()}`);
    return response.data;
};

export const getUsersWithSkill = async (skillId, page = 1, limit = 20) => {
    const response = await api.get(`/skills/${skillId}/users?page=${page}&limit=${limit}`);
    return response.data;
};

export const getUserSkills = async () => {
    const response = await api.get('/skills/my');
    return response.data;
};

export const addSkill = async (skillData) => {
    const response = await api.post('/skills/my', skillData);
    return response.data;
};

export const createSkill = async (skillData) => {
    const response = await api.post('/skills', skillData);
    return response.data;
};

export const uploadSkillDemo = async (videoFile, onProgress) => {
    const formData = new FormData();
    formData.append('video', videoFile);

    const response = await api.post('/skills/upload-demo', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (event) => {
            if (!onProgress || !event.total) return;
            const percent = Math.round((event.loaded * 100) / event.total);
            onProgress(percent);
        }
    });

    return response.data;
};

export const removeSkill = async (skillId) => {
    const response = await api.delete(`/skills/my/${skillId}`);
    return response.data;
};
