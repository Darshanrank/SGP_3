import express from "express";
const router = express.Router();
import { login, register, verify, resetPassword, setPassword } from "../controllers/auth.controller.js";
import { validateAuthInput, validatePasswordInput, validateEmailInput } from '../middlewares/auth.middleware.js'

router.post('/register', validateAuthInput, register);
router.post('/login', validateAuthInput, login);
router.get('/verify/:token', verify);
router.post('/reset-password', validateEmailInput, resetPassword);
router.post('/reset-password/:token', validatePasswordInput, setPassword);

export default router;