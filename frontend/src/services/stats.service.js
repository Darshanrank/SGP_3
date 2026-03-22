import api from './api';

export const getCommunityStats = async () => {
    const response = await api.get('/stats');
    return response.data;
};
