import express from 'express';
import { 
    createSwapRequest, 
    getMyRequests, 
    updateRequestStatus, 
    getClassDetails, 
    addClassTodo, 
    toggleTodo, 
    completeClass,
    getMyClasses,
    getPinnedResources,
    addPinnedResource,
    deletePinnedResource,
    getCodeSnippets,
    addCodeSnippet,
    deleteCodeSnippet,
    getClassroomFiles,
    uploadClassroomFile,
    getSharedNote,
    updateSharedNote
} from '../controllers/swap.controller.js';
import { validateTokenMiddleware } from '../middlewares/token.middleware.js';
import {
    validateSwapRequestInput,
    validateSwapStatusInput,
    validateTodoInput,
    validateToggleTodoInput,
    validatePinnedResourceInput,
    validateCodeSnippetInput,
    validateSharedNoteInput
} from '../middlewares/validation.middleware.js';
import { uploadClassroomFileMiddleware } from '../middlewares/upload.middleware.js';

const router = express.Router();

router.use(validateTokenMiddleware);

// Swap Requests
router.post('/requests', validateSwapRequestInput, createSwapRequest);
router.get('/requests', getMyRequests); // ?type=sent|received
router.put('/requests/:id', validateSwapStatusInput, updateRequestStatus);

// Classes
router.get('/classes', getMyClasses);
router.get('/classes/:id', getClassDetails);

// Class Todos
router.post('/classes/:id/todos', validateTodoInput, addClassTodo);
router.put('/classes/todos/:todoId', validateToggleTodoInput, toggleTodo);

// Completion
router.post('/classes/:id/complete', completeClass);

// Classroom productivity tools
router.get('/classes/:id/resources', getPinnedResources);
router.post('/classes/:id/resources', validatePinnedResourceInput, addPinnedResource);
router.delete('/classes/:id/resources/:resourceId', deletePinnedResource);

router.get('/classes/:id/snippets', getCodeSnippets);
router.post('/classes/:id/snippets', validateCodeSnippetInput, addCodeSnippet);
router.delete('/classes/:id/snippets/:snippetId', deleteCodeSnippet);

router.get('/classes/:id/files', getClassroomFiles);
router.post('/classes/:id/files', uploadClassroomFileMiddleware.single('classroomFile'), uploadClassroomFile);

router.get('/classes/:id/notes', getSharedNote);
router.put('/classes/:id/notes', validateSharedNoteInput, updateSharedNote);

export default router;
