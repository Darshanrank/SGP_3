import {
    getMatchedUsersService,
    discoverUsersService,
    getSavedFiltersService,
    createSavedFilterService,
    deleteSavedFilterService
} from '../services/matching.service.js';
import { ValidationError } from '../errors/generic.errors.js';

export const getMatchedUsers = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const page = Number.parseInt(req.query.page, 10) || 1;
        const limit = Number.parseInt(req.query.limit, 10) || 10;
        const result = await getMatchedUsersService(userId, { page, limit });
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const discoverUsers = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const result = await discoverUsersService(userId, req.query || {});
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const getSavedFilters = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const filters = await getSavedFiltersService(userId);
        res.json(filters);
    } catch (error) {
        next(error);
    }
};

export const createSavedFilter = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const created = await createSavedFilterService(userId, req.body || {});
        res.status(201).json(created);
    } catch (error) {
        next(error);
    }
};

export const deleteSavedFilter = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const id = Number.parseInt(req.params.id, 10);
        if (!Number.isInteger(id)) {
            throw new ValidationError('Invalid saved filter id', 'INVALID_SAVED_FILTER_ID');
        }
        const result = await deleteSavedFilterService(userId, id);
        res.json(result);
    } catch (error) {
        next(error);
    }
};
