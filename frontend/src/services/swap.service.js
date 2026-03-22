// src/services/swap.service.js
import api from './api';

export const createSwapRequest = async (requestData) => {
    const response = await api.post('/swaps/requests', requestData);
    return response.data;
};

export const getMyRequests = async (type, page = 1, limit = 20) => {
    // type can be 'sent' or 'received'
    const response = await api.get(`/swaps/requests?type=${type}&page=${page}&limit=${limit}`);
    return response.data;
};

export const updateRequestStatus = async (requestId, status, cancelReason) => {
    const payload = { status };
    if (typeof cancelReason === 'string' && cancelReason.trim()) {
        payload.cancelReason = cancelReason.trim();
    }
    const response = await api.put(`/swaps/requests/${requestId}`, payload);
    return response.data;
};

export const getMyClasses = async (page = 1, limit = 20) => {
    const response = await api.get(`/swaps/classes?page=${page}&limit=${limit}`);
    return response.data;
};

export const getClassDetails = async (classId) => {
    const response = await api.get(`/swaps/classes/${classId}`);
    return response.data;
};

export const addClassTodo = async (classId, todo) => {
    const response = await api.post(`/swaps/classes/${classId}/todos`, todo);
    return response.data;
};

export const toggleTodo = async (todoId, isCompleted) => {
    const response = await api.put(`/swaps/classes/todos/${todoId}`, { isCompleted });
    return response.data;
};

export const completeClass = async (classId) => {
    const response = await api.post(`/swaps/classes/${classId}/complete`);
    return response.data;
};

export const getPinnedResources = async (classId) => {
    const response = await api.get(`/swaps/classes/${classId}/resources`);
    return response.data;
};

export const addPinnedResource = async (classId, payload) => {
    const response = await api.post(`/swaps/classes/${classId}/resources`, payload);
    return response.data;
};

export const deletePinnedResource = async (classId, resourceId) => {
    const response = await api.delete(`/swaps/classes/${classId}/resources/${resourceId}`);
    return response.data;
};

export const getCodeSnippets = async (classId) => {
    const response = await api.get(`/swaps/classes/${classId}/snippets`);
    return response.data;
};

export const addCodeSnippet = async (classId, payload) => {
    const response = await api.post(`/swaps/classes/${classId}/snippets`, payload);
    return response.data;
};

export const deleteCodeSnippet = async (classId, snippetId) => {
    const response = await api.delete(`/swaps/classes/${classId}/snippets/${snippetId}`);
    return response.data;
};

export const getClassroomFiles = async (classId) => {
    const response = await api.get(`/swaps/classes/${classId}/files`);
    return response.data;
};

export const uploadClassroomFile = async (classId, file) => {
    const formData = new FormData();
    formData.append('classroomFile', file);

    const response = await api.post(`/swaps/classes/${classId}/files`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

export const getSharedNote = async (classId) => {
    const response = await api.get(`/swaps/classes/${classId}/notes`);
    return response.data;
};

export const updateSharedNote = async (classId, content) => {
    const response = await api.put(`/swaps/classes/${classId}/notes`, { content });
    return response.data;
};
