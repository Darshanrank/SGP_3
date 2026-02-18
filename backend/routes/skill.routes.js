import express from 'express';
import { getAllSkills, createSkill, getUserSkills, addUserSkill, removeUserSkill, getUsersWithSkill } from '../controllers/skill.controller.js';
import { validateTokenMiddleware } from '../middlewares/token.middleware.js';

const router = express.Router();

router.use(validateTokenMiddleware);

// Master list
router.get('/', getAllSkills);
router.post('/', createSkill); // Maybe admin only later
router.get('/:id/users', getUsersWithSkill);

// User skills
router.get('/my', getUserSkills);
router.post('/my', addUserSkill);
router.delete('/my/:id', removeUserSkill);

export default router;
