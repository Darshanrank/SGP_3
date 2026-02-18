import { 
    createSwapRequestService, 
    getMyRequestsService, 
    updateRequestStatusService, 
    getMyClassesService, 
    getClassDetailsService, 
    addClassTodoService, 
    toggleTodoService, 
    completeClassService 
} from '../services/swap.service.js';

// Create Swap Request
export const createSwapRequest = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const request = await createSwapRequestService(userId, req.body);
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
        const requests = await getMyRequestsService(userId, type);
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
        const result = await updateRequestStatusService(userId, requestId, req.body);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

// Get My Classes
export const getMyClasses = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const classes = await getMyClassesService(userId);
        res.json(classes);
    } catch (error) {
        next(error);
    }
};

// Get Class Details
export const getClassDetails = async (req, res, next) => {
    try {
        const classId = parseInt(req.params.id);
        const details = await getClassDetailsService(classId);
        res.json(details);
    } catch (error) {
        next(error);
    }
};

// Add Todo
export const addClassTodo = async (req, res, next) => {
    try {
        const classId = parseInt(req.params.id);
        const todo = await addClassTodoService(classId, req.body);
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
        const todo = await toggleTodoService(todoId, isCompleted);
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
        const result = await completeClassService(userId, classId);
        res.json(result);
    } catch (error) {
        next(error);
    }
};
