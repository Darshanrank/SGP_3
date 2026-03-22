import { 
    getAllSkillsService, 
    createSkillService, 
    getUserSkillsService, 
    addUserSkillService, 
    removeUserSkillService,
    updateUserSkillService,
    reorderUserSkillsService,
    getUsersWithSkillService
} from '../services/skill.service.js';
import { conf } from '../conf/conf.js';
import { ValidationError } from '../errors/generic.errors.js';

// Get all Skills (Master List)
export const getAllSkills = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const category = req.query.category || '';
        
        const skip = (page - 1) * limit;

        const result = await getAllSkillsService({ skip, take: limit, search, category });
        res.json(result);
    } catch (error) {
        next(error);
    }
};

// Get Users with specific skill
export const getUsersWithSkill = async (req, res, next) => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const type = req.query.type;
        const level = req.query.level;

        const skillId = Number.parseInt(id, 10);
        if (!Number.isInteger(skillId)) {
            throw new ValidationError('Invalid skill id', 'INVALID_SKILL_ID');
        }

        if (type && !['TEACH', 'LEARN'].includes(type)) {
            throw new ValidationError('Invalid skill type', 'INVALID_SKILL_TYPE');
        }

        if (level && !['LOW', 'MEDIUM', 'HIGH'].includes(level)) {
            throw new ValidationError('Invalid skill level', 'INVALID_SKILL_LEVEL');
        }
        
        const skip = (page - 1) * limit;

        const result = await getUsersWithSkillService(skillId, { skip, take: limit, type, level });
        res.json(result);
    } catch (error) {
        next(error);
    }
};

// Create a new Skill (Admin/System)
export const createSkill = async (req, res, next) => {
    try {
        const skill = await createSkillService(req.body);
        res.status(201).json(skill);
    } catch (error) {
        next(error);
    }
};

// Get User's Skills
export const getUserSkills = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const skills = await getUserSkillsService(userId);
        res.json(skills);
    } catch (error) {
        next(error);
    }
};

// Add User Skill
export const addUserSkill = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const skill = await addUserSkillService(userId, req.body);
        res.status(201).json(skill);
    } catch (error) {
        next(error);
    }
};

// Delete User Skill
export const removeUserSkill = async (req, res, next) => {
    try {
        const skillId = parseInt(req.params.id);
        const userId = req.user.userId;
        if (!Number.isInteger(skillId)) {
            throw new ValidationError('Invalid user skill id', 'INVALID_USER_SKILL_ID');
        }
        const result = await removeUserSkillService(userId, skillId);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const updateUserSkill = async (req, res, next) => {
    try {
        const userSkillId = parseInt(req.params.id);
        const userId = req.user.userId;
        if (!Number.isInteger(userSkillId)) {
            throw new ValidationError('Invalid user skill id', 'INVALID_USER_SKILL_ID');
        }

        const skill = await updateUserSkillService(userId, userSkillId, req.body);
        res.json(skill);
    } catch (error) {
        next(error);
    }
};

export const reorderUserSkills = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const result = await reorderUserSkillsService(userId, req.body?.skillIds);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const uploadSkillDemo = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Video file is required' });
        }

        // req.file.path includes the subfolder (e.g. uploads/skills/uuid-file.mp4)
        const relativePath = req.file.path.replace(/\\/g, '/');
        const url = req.file.location || `${conf.BACKEND_URL || `http://localhost:${conf.PORT}`}/${relativePath}`;

        return res.status(200).json({
            url,
            message: 'Skill demo uploaded successfully'
        });
    } catch (error) {
        next(error);
    }
};
