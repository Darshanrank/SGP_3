import api from './api';

export const updateProfile = async (profileData) => {
    const response = await api.put('/profile/me', profileData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

export const getMyProfile = async () => {
    const response = await api.get('/profile/me');
    return response.data;
};

export const sendUpcomingReminder = async () => {
    const response = await api.post('/profile/me/send-reminder');
    return response.data;
};

export const deleteAccount = async () => {
    const response = await api.delete('/profile/me');
    return response.data;
};

export const getPublicProfile = async (userId) => {
    const response = await api.get(`/profile/${userId}`);
    return response.data;
};

export const getPublicProfileByUsername = async (username) => {
    const response = await api.get(`/profile/username/${encodeURIComponent(username)}`);
    return response.data;
};
