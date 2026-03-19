import { getMyProfileService, updateProfileService, getPublicProfileService, getPublicProfileByUsernameService, sendUpcomingReminderService, getFeaturedProfilesService } from '../services/profile.service.js';
import { deleteAccountService } from '../services/deleteAccount.service.js';
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
            // req.file.path includes the subfolder (e.g. uploads/avatars/uuid-file.jpg)
            const relativePath = req.file.path.replace(/\\/g, '/');
            data.avatarUrl = req.file.location || `${conf.BACKEND_URL || `http://localhost:${conf.PORT}`}/${relativePath}`;
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
        const viewerId = req.user?.userId ?? null;
        const profile = await getPublicProfileService(userId, viewerId);
        res.json(profile);
    } catch (error) {
        next(error);
    }
};

// Delete account (GDPR)
export const deleteAccount = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const result = await deleteAccountService(userId);
        // Clear cookies
        res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict' });
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const getPublicProfileByUsername = async (req, res, next) => {
    try {
        const username = req.params.username;
        const viewerId = req.user?.userId ?? null;
        const profile = await getPublicProfileByUsernameService(username, viewerId);
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

export const getFeaturedProfiles = async (req, res, next) => {
    try {
        const { limit, category, search } = req.query;
        const data = await getFeaturedProfilesService({ limit, category, search });
        res.json({ data });
    } catch (error) {
        next(error);
    }
};
