import { getMyProfileService, updateProfileService, getPublicProfileService, getPublicProfileByUsernameService, sendUpcomingReminderService } from '../services/profile.service.js';
import { ValidationError } from '../errors/generic.errors.js';
import { conf } from '../conf/conf.js';

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
        const data = { ...req.body };

        if (typeof data.emailRemindersEnabled === 'string') {
            data.emailRemindersEnabled = data.emailRemindersEnabled === 'true';
        }

        if (typeof data.profileCompleted === 'string') {
            data.profileCompleted = data.profileCompleted === 'true';
        }

        if (typeof data.availability === 'string') {
            try {
                data.availability = JSON.parse(data.availability);
            } catch (_) {
                data.availability = [];
            }
        }
        
        if (req.file) {
            data.avatarUrl = req.file.location || `${conf.BACKEND_URL || `http://localhost:${conf.PORT}`}/uploads/${req.file.filename}`;
        }

        const profile = await updateProfileService(userId, data);
        res.json(profile);
    } catch (error) {
        next(error);
    }
};

// Get Public Profile by ID
export const getPublicProfile = async (req, res, next) => {
    try {
        const userId = Number.parseInt(req.params.id, 10);
        if (!Number.isInteger(userId)) {
            throw new ValidationError('Invalid user id', 'INVALID_USER_ID');
        }
        const profile = await getPublicProfileService(userId);
        res.json(profile);
    } catch (error) {
        next(error);
    }
};

export const getPublicProfileByUsername = async (req, res, next) => {
    try {
        const username = req.params.username;
        const profile = await getPublicProfileByUsernameService(username);
        res.json(profile);
    } catch (error) {
        next(error);
    }
};

export const sendUpcomingReminder = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const result = await sendUpcomingReminderService(userId);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
