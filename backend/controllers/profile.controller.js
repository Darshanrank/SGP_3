import { getMyProfileService, updateProfileService, getPublicProfileService } from '../services/profile.service.js';

// Get current user profile
export const getMyProfile = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const profile = await getMyProfileService(userId);
        res.json(profile);
    } catch (error) {
        next(error);
    }
};

// Update profile
export const updateProfile = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const profile = await updateProfileService(userId, req.body);
        res.json(profile);
    } catch (error) {
        next(error);
    }
};

// Get Public Profile by ID
export const getPublicProfile = async (req, res, next) => {
    try {
        const userId = parseInt(req.params.id);
        const profile = await getPublicProfileService(userId);
        res.json(profile);
    } catch (error) {
        next(error);
    }
};
