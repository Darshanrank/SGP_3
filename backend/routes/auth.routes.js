import express from "express";
const router = express.Router();
import { login } from "../controllers/auth.controllers.js";
import { register } from "../controllers/auth.controllers.js";
import { verify } from "../controllers/auth.controllers.js";
import { resetPassword } from "../controllers/auth.controllers.js";
import { setPassword } from "../controllers/auth.controllers.js";
import {validateAuthInput,validatePasswordInput} from '../middlewares/auth.middleware.js'

router.post('/register', validateAuthInput, register);
router.post('/login',validateAuthInput,login);
router.get('/verify/:token', verify);
router.post('/reset-password', resetPassword);
router.post('/reset-password/:token', validatePasswordInput, setPassword);


export default router;