import { 
    getAllSkillsService, 
    createSkillService, 
    getUserSkillsService, 
    addUserSkillService, 
    removeUserSkillService,
    getUsersWithSkillService
} from '../services/skill.service.js';

// Get all Skills (Master List)
export const getAllSkills = async (req, res, next) => {
    try {
        const skills = await getAllSkillsService();
        res.json(skills);
    } catch (error) {
        next(error);
    }
};

// Get Users with specific skill
export const getUsersWithSkill = async (req, res, next) => {
    try {
        const { id } = req.params;
        const users = await getUsersWithSkillService(id);
        res.json(users);
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
        const result = await removeUserSkillService(userId, skillId);
        res.json(result);
    } catch (error) {
        next(error);
    }
};
