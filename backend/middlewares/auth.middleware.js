import { ValidationError } from '../errors/generic.errors.js';

const validateEmail = (email) => {
    if (!email) {
        throw new ValidationError('Missing required fields');
    }

    email = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new ValidationError('Invalid email format');
    }

    return email;
};

const validatePassword = (password) => {
    if (!password) {
        throw new ValidationError('Missing required fields');
    }

    password = password.trim();

    if (password.length < 8) {
        throw new ValidationError('Password must be at least 8 characters long');
    }

    const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;

    if (!passwordRegex.test(password)) {
        throw new ValidationError(
            'Password must include uppercase, lowercase, number, and special character'
        );
    }

    return password;
};

export const validateAuthInput = (req, res, next) => {
    try {
        const { email, password } = req.body;

        req.body.email = validateEmail(email);
        req.body.password = validatePassword(password);

        next();
    } catch (error) {
        next(error);
    }
};

export const validatePasswordInput = (req, res, next) => {
    try {
        const { password } = req.body;
        req.body.password = validatePassword(password);
        next();
    } catch (error) {
        next(error);
    }
};

export const validateEmailInput = (req, res, next) => {
    try {
        const { email } = req.body;
        req.body.email = validateEmail(email);
        next();
    } catch (error) {
        next(error);
    }
};
    // const { password } = req.body;
    // console.log(password);
    
    // req.body.password = validatePassword(password);

    // next();

