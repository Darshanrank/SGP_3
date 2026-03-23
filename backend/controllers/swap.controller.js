import { 
    createSwapRequestService, 
    getMyRequestsService, 
    updateRequestStatusService, 
    getMyClassesService, 
    getClassDetailsService, 
    addClassTodoService, 
    toggleTodoService, 
    completeClassService,
    getPinnedResourcesService,
    addPinnedResourceService,
    deletePinnedResourceService,
    getCodeSnippetsService,
    addCodeSnippetService,
    deleteCodeSnippetService,
    getClassroomFilesService,
    addClassroomFileService,
    deleteClassroomFileService,
    getSharedNoteService,
    upsertSharedNoteService
} from '../services/swap.service.js';
import { ValidationError } from '../errors/generic.errors.js';
import { conf } from '../conf/conf.js';

// Create Swap Request
export const createSwapRequest = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const io = req.app.get('io');
        const request = await createSwapRequestService(userId, req.body, { io });

        res.status(201).json(request);
    } catch (error) {
        next(error);
    }
};

// Get My Requests (Sent & Received)
export const getMyRequests = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const type = req.query.type;
        const page = Number.parseInt(req.query.page, 10) || 1;
        const limit = Number.parseInt(req.query.limit, 10) || 20;
        const requests = await getMyRequestsService(userId, type, { page, limit });
        res.json(requests);
    } catch (error) {
        next(error);
    }
};

// Update Request Status
export const updateRequestStatus = async (req, res, next) => {
    try {
        const requestId = parseInt(req.params.id);
        const userId = req.user.userId;
        if (!Number.isInteger(requestId)) {
            throw new ValidationError('Invalid request id', 'INVALID_REQUEST_ID');
        }
        const io = req.app.get('io');
        const result = await updateRequestStatusService(userId, requestId, req.body, { io });

        res.json(result);
    } catch (error) {
        next(error);
    }
};

// Get My Classes
export const getMyClasses = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const page = Number.parseInt(req.query.page, 10) || 1;
        const limit = Number.parseInt(req.query.limit, 10) || 20;
        const classes = await getMyClassesService(userId, { page, limit });
        res.json(classes);
    } catch (error) {
        next(error);
    }
};

// Get Class Details
export const getClassDetails = async (req, res, next) => {
    try {
        const classId = parseInt(req.params.id);
        const userId = req.user.userId;
        if (!Number.isInteger(classId)) {
            throw new ValidationError('Invalid class id', 'INVALID_CLASS_ID');
        }
        const details = await getClassDetailsService(userId, classId);
        res.json(details);
    } catch (error) {
        next(error);
    }
};

// Add Todo
export const addClassTodo = async (req, res, next) => {
    try {
        const classId = parseInt(req.params.id);
        const userId = req.user.userId;
        if (!Number.isInteger(classId)) {
            throw new ValidationError('Invalid class id', 'INVALID_CLASS_ID');
        }
        const todo = await addClassTodoService(userId, classId, req.body);
        res.status(201).json(todo);
    } catch (error) {
        next(error);
    }
};

// Toggle Todo
export const toggleTodo = async (req, res, next) => {
    try {
        const todoId = parseInt(req.params.todoId);
        const { isCompleted } = req.body;
        const userId = req.user.userId;
        if (!Number.isInteger(todoId)) {
            throw new ValidationError('Invalid todo id', 'INVALID_TODO_ID');
        }
        const todo = await toggleTodoService(userId, todoId, isCompleted);
        res.json(todo);
    } catch (error) {
        next(error);
    }
};

// Complete Class
export const completeClass = async (req, res, next) => {
    try {
        const classId = parseInt(req.params.id);
        const userId = req.user.userId;
        if (!Number.isInteger(classId)) {
            throw new ValidationError('Invalid class id', 'INVALID_CLASS_ID');
        }
        const result = await completeClassService(userId, classId);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

const normalizeId = (value, fieldName) => {
    const id = Number.parseInt(value, 10);
    if (!Number.isInteger(id)) {
        throw new ValidationError(`Invalid ${fieldName}`, `INVALID_${fieldName.toUpperCase().replace(/\s+/g, '_')}`);
    }
    return id;
};

const getUploadedFileUrl = (file) => {
    if (!file) return null;
    if (file.location) return file.location;
    const relativePath = String(file.path || '').replace(/\\/g, '/');
    if (!relativePath) return null;
    return `${conf.BACKEND_URL || `http://localhost:${conf.PORT}`}/${relativePath}`;
};

export const getPinnedResources = async (req, res, next) => {
    try {
        const classId = normalizeId(req.params.id, 'class id');
        const userId = req.user.userId;
        const resources = await getPinnedResourcesService(userId, classId);
        res.json(resources);
    } catch (error) {
        next(error);
    }
};

export const addPinnedResource = async (req, res, next) => {
    try {
        const classId = normalizeId(req.params.id, 'class id');
        const userId = req.user.userId;
        const resource = await addPinnedResourceService(userId, classId, req.body);
        res.status(201).json(resource);
    } catch (error) {
        next(error);
    }
};

export const deletePinnedResource = async (req, res, next) => {
    try {
        const classId = normalizeId(req.params.id, 'class id');
        const resourceId = normalizeId(req.params.resourceId, 'resource id');
        const userId = req.user.userId;
        const result = await deletePinnedResourceService(userId, classId, resourceId);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const getCodeSnippets = async (req, res, next) => {
    try {
        const classId = normalizeId(req.params.id, 'class id');
        const userId = req.user.userId;
        const snippets = await getCodeSnippetsService(userId, classId);
        res.json(snippets);
    } catch (error) {
        next(error);
    }
};

export const addCodeSnippet = async (req, res, next) => {
    try {
        const classId = normalizeId(req.params.id, 'class id');
        const userId = req.user.userId;
        const snippet = await addCodeSnippetService(userId, classId, req.body);
        res.status(201).json(snippet);
    } catch (error) {
        next(error);
    }
};

export const deleteCodeSnippet = async (req, res, next) => {
    try {
        const classId = normalizeId(req.params.id, 'class id');
        const snippetId = normalizeId(req.params.snippetId, 'snippet id');
        const userId = req.user.userId;
        const result = await deleteCodeSnippetService(userId, classId, snippetId);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const getClassroomFiles = async (req, res, next) => {
    try {
        const classId = normalizeId(req.params.id, 'class id');
        const userId = req.user.userId;
        const files = await getClassroomFilesService(userId, classId);
        res.json(files);
    } catch (error) {
        next(error);
    }
};

export const uploadClassroomFile = async (req, res, next) => {
    try {
        const classId = normalizeId(req.params.id, 'class id');
        const userId = req.user.userId;
        if (!req.file) {
            throw new ValidationError('Classroom file is required');
        }

        const fileUrl = getUploadedFileUrl(req.file);
        if (!fileUrl) {
            throw new ValidationError('Could not resolve uploaded file URL');
        }

        const saved = await addClassroomFileService(userId, classId, {
            fileName: req.file.originalname,
            fileUrl
        });

        res.status(201).json(saved);
    } catch (error) {
        next(error);
    }
};

export const deleteClassroomFile = async (req, res, next) => {
    try {
        const classId = normalizeId(req.params.id, 'class id');
        const fileId = normalizeId(req.params.fileId, 'file id');
        const userId = req.user.userId;
        const result = await deleteClassroomFileService(userId, classId, fileId);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const getSharedNote = async (req, res, next) => {
    try {
        const classId = normalizeId(req.params.id, 'class id');
        const userId = req.user.userId;
        const note = await getSharedNoteService(userId, classId);
        res.json(note);
    } catch (error) {
        next(error);
    }
};

export const updateSharedNote = async (req, res, next) => {
    try {
        const classId = normalizeId(req.params.id, 'class id');
        const userId = req.user.userId;
        const note = await upsertSharedNoteService(userId, classId, req.body);

        const io = req.app.get('io');
        if (io) {
            io.to(`chat_${classId}`).emit('shared_note_updated', {
                classId,
                content: note.content,
                updatedAt: note.updatedAt,
                updatedBy: userId
            });
        }

        res.json(note);
    } catch (error) {
        next(error);
    }
};
