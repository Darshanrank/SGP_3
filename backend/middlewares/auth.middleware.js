import { z } from 'zod';
import { ValidationError } from '../errors/generic.errors.js';

// Schemas
const emailSchema = z.string({ required_error: "Missing required fields" })
    .email('Invalid email format')
    .transform(val => val.trim().toLowerCase());

const loginPasswordSchema = z.string({ required_error: "Missing required fields" })
    .min(1, 'Password is required')
    .transform(val => val.trim());

const passwordSchema = z.string({ required_error: "Missing required fields" })
    .min(8, 'Password must be at least 8 characters long')
    .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, 'Password must include uppercase, lowercase, number, and special character')
    .transform(val => val.trim());

const registerSchema = z.object({
    username: z.string({ required_error: 'Username is required' })
        .trim()
        .min(3, 'Username must be at least 3 characters long'),
    email: emailSchema,
    password: passwordSchema,
});

const loginSchema = z.object({
    email: emailSchema,
    password: loginPasswordSchema,
    rememberMe: z.boolean().optional()
}).catchall(z.any());

// Specific Schemas
const emailOnlySchema = z.object({ email: emailSchema });
const passwordOnlySchema = z.object({ password: passwordSchema });

// Middleware Factory
const validate = (schema) => (req, res, next) => {
    try {
        // Parse body. Zod .parse returns the parsed data.
        // We use .parse() which throws on error.
        // We might want to use .safeParse() if we want custom error handling without try/catch
        const parsed = schema.parse(req.body);
        
        // Merge parsed data back to req.body (preserves other fields if schema allows, or use strict/passthrough)
        // Here we just update the validated fields to their transformed values
        Object.assign(req.body, parsed);
        
        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            const message = error.issues?.[0]?.message || 'Invalid input';
            next(new ValidationError(message));
        } else {
            next(error);
        }
    }
};

export const validateRegisterInput = validate(registerSchema);
export const validateLoginInput = validate(loginSchema);
export const validatePasswordInput = validate(passwordOnlySchema);
export const validateEmailInput = validate(emailOnlySchema);

    // const { password } = req.body;
    // console.log(password);
    
    // req.body.password = validatePassword(password);

    // next();

