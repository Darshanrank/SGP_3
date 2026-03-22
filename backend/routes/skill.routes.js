import express from 'express';
import { getAllSkills, createSkill, getUserSkills, addUserSkill, removeUserSkill, updateUserSkill, reorderUserSkills, getUsersWithSkill, uploadSkillDemo } from '../controllers/skill.controller.js';
import { validateTokenMiddleware } from '../middlewares/token.middleware.js';
import { uploadMiddleware } from '../middlewares/upload.middleware.js';
import { validateCreateSkillInput, validateUserSkillInput, validateUpdateUserSkillInput, validateReorderUserSkillsInput } from '../middlewares/validation.middleware.js';

const router = express.Router();

router.use(validateTokenMiddleware);

// Master list
router.get('/', getAllSkills);
router.post('/', validateCreateSkillInput, createSkill); // Maybe admin only later
router.get('/:id/users', getUsersWithSkill);

// User skills
router.get('/my', getUserSkills);
router.post('/my', validateUserSkillInput, addUserSkill);
router.put('/my/reorder', validateReorderUserSkillsInput, reorderUserSkills);
router.put('/my/:id', validateUpdateUserSkillInput, updateUserSkill);
router.delete('/my/:id', removeUserSkill);
router.post('/upload-demo', uploadMiddleware.single('video'), uploadSkillDemo);

export default router;
