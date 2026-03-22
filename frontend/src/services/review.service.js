// src/services/review.service.js
import api from './api';

export const createReview = async ({
    swapClassId,
    clarityRating,
    punctualityRating,
    communicationRating,
    expertiseRating,
    comment
}) => {
    const response = await api.post('/reviews', {
        swapClassId,
        clarityRating,
        punctualityRating,
        communicationRating,
        expertiseRating,
        comment
    });
    return response.data;
};

export const markReviewHelpful = async (reviewId) => {
    const response = await api.post(`/reviews/${reviewId}/helpful`);
    return response.data;
};

export const getClassReviews = async (classId) => {
    const response = await api.get(`/reviews/class/${classId}`);
    return response.data;
};

export const hasReviewedClass = async (classId) => {
    const response = await api.get(`/reviews/class/${classId}/mine`);
    return response.data;
};

export const getUserReviews = async (userId, page = 1, limit = 10) => {
    const response = await api.get(`/reviews/user/${userId}?page=${page}&limit=${limit}`);
    return response.data;
};

export const getUserRating = async (userId) => {
    const response = await api.get(`/reviews/user/${userId}/rating`);
    return response.data;
};
