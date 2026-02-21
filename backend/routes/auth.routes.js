import express from "express";
const router = express.Router();
import { login, register, verify, resetPassword, setPassword, logout, refresh } from "../controllers/auth.controller.js";
import { validateRegisterInput, validateLoginInput, validatePasswordInput, validateEmailInput } from '../middlewares/auth.middleware.js'

router.post('/register', validateRegisterInput, register);
router.post('/login', validateLoginInput, login);
router.post('/refresh', refresh);
router.get('/verify/:token', verify);
router.post('/reset-password', validateEmailInput, resetPassword);
router.post('/reset-password/:token', validatePasswordInput, setPassword);
router.post('/logout', logout);

export default router;