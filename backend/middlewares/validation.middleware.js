import { z } from 'zod';
import { ValidationError } from '../errors/generic.errors.js';

const toInt = (value) => {
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isNaN(parsed) ? value : parsed;
    }
    return value;
};

const toDate = (value) => {
    if (value instanceof Date) return value;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? value : parsed;
    }
    return value;
};

const emptyToUndefined = (value) => {
    if (value === '') return undefined;
    return value;
};

const validate = (schema) => (req, _res, next) => {
    try {
        const parsed = schema.parse(req.body);
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

const paginationSchema = z.object({
    page: z.preprocess(toInt, z.number().int().positive()).optional(),
    limit: z.preprocess(toInt, z.number().int().positive().max(100)).optional()
}).partial();

const swapRequestSchema = z.object({
    toUserId: z.preprocess(toInt, z.number().int().positive()),
    learnSkillId: z.preprocess(toInt, z.number().int().positive()),
    teachSkillId: z.preprocess(toInt, z.number().int().positive()).optional().nullable(),
    message: z.string().max(1000).optional().nullable()
});

const swapStatusSchema = z.object({
    status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED']),
    cancelReason: z.string().trim().min(5, 'Cancel reason must be at least 5 characters').max(500).optional().nullable()
}).superRefine((data, ctx) => {
    if (data.status === 'CANCELLED' && !data.cancelReason) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['cancelReason'],
            message: 'Cancel reason is required when cancelling a request'
        });
    }
});

const todoSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional().nullable(),
    dueDate: z.preprocess(toDate, z.date()).optional().nullable()
});

const toggleTodoSchema = z.object({
    isCompleted: z.boolean()
});

const createSkillSchema = z.object({
    name: z.string().min(1).max(50),
    category: z.string().min(1).max(50)
});

const userSkillSchema = z.object({
    skillId: z.preprocess(toInt, z.number().int().positive()),
    type: z.enum(['TEACH', 'LEARN']),
    level: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    proofUrl: z.preprocess(emptyToUndefined, z.string().url().optional().nullable()),
    preview: z.object({
        videoUrl: z.preprocess(emptyToUndefined, z.string().url().optional().nullable()),
        description: z.string().max(2000).optional().nullable(),
        syllabusOutline: z.string().max(2000).optional().nullable()
    }).optional().nullable()
});

const updateUserSkillSchema = z.object({
    type: z.enum(['TEACH', 'LEARN']),
    level: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    category: z.string().trim().min(1).max(50)
});

const reorderUserSkillsSchema = z.object({
    skillIds: z.array(z.preprocess(toInt, z.number().int().positive())).min(1)
});

const reportSchema = z.object({
    reportedUserId: z.preprocess(toInt, z.number().int().positive()),
    reason: z.enum(['SPAM', 'HARASSMENT', 'SCAM_OR_FRAUD', 'INAPPROPRIATE_CONTENT', 'IMPERSONATION', 'OTHER']),
    description: z.string().trim().max(1000).optional().nullable()
});

const calendarEventSchema = z.object({
    title: z.string().min(2).max(100),
    eventDate: z.preprocess(toDate, z.date()),
    description: z.string().max(1000).optional().nullable(),
    swapClassId: z.preprocess(toInt, z.number().int().positive()).optional().nullable()
});

const badgeSchema = z.object({
    name: z.string().min(2).max(60),
    condition: z.string().min(2).max(255)
});

const assignBadgeSchema = z.object({
    userId: z.preprocess(toInt, z.number().int().positive()),
    badgeId: z.preprocess(toInt, z.number().int().positive())
});

const penaltySchema = z.object({
    userId: z.preprocess(toInt, z.number().int().positive()),
    reason: z.string().min(5).max(500),
    penaltyType: z.enum(['WARNING', 'SUSPEND', 'BAN'])
});

const messageSchema = z.object({
    message: z.string().min(1).max(2000)
});

const structuredReviewSchema = z.object({
    swapClassId: z.preprocess(toInt, z.number().int().positive()),
    clarityRating: z.preprocess(toInt, z.number().int().min(1).max(5)),
    punctualityRating: z.preprocess(toInt, z.number().int().min(1).max(5)),
    communicationRating: z.preprocess(toInt, z.number().int().min(1).max(5)),
    expertiseRating: z.preprocess(toInt, z.number().int().min(1).max(5)),
    comment: z.string().max(2000).optional().nullable()
});

const pinnedResourceSchema = z.object({
    title: z.string().trim().min(1).max(120),
    url: z.string().trim().url().max(1000)
});

const codeSnippetSchema = z.object({
    title: z.string().trim().min(1).max(120),
    language: z.string().trim().min(1).max(40).optional(),
    code: z.string().min(1).max(50000)
});

const sharedNoteSchema = z.object({
    content: z.string().max(100000).optional().default('')
});

export const validateSwapRequestInput = validate(swapRequestSchema);
export const validateSwapStatusInput = validate(swapStatusSchema);
export const validateTodoInput = validate(todoSchema);
export const validateToggleTodoInput = validate(toggleTodoSchema);
export const validateCreateSkillInput = validate(createSkillSchema);
export const validateUserSkillInput = validate(userSkillSchema);
export const validateUpdateUserSkillInput = validate(updateUserSkillSchema);
export const validateReorderUserSkillsInput = validate(reorderUserSkillsSchema);
export const validateReportInput = validate(reportSchema);
export const validateCalendarEventInput = validate(calendarEventSchema);
export const validateBadgeInput = validate(badgeSchema);
export const validateAssignBadgeInput = validate(assignBadgeSchema);
export const validatePenaltyInput = validate(penaltySchema);
export const validateMessageInput = validate(messageSchema);
export const validateStructuredReviewInput = validate(structuredReviewSchema);
export const validatePaginationInput = validate(paginationSchema);
export const validatePinnedResourceInput = validate(pinnedResourceSchema);
export const validateCodeSnippetInput = validate(codeSnippetSchema);
export const validateSharedNoteInput = validate(sharedNoteSchema);
