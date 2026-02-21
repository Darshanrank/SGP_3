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

export const updateRequestStatus = async (requestId, status) => {
    const response = await api.put(`/swaps/requests/${requestId}`, { status });
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
