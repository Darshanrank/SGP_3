import express from 'express';
import { 
    createSwapRequest, 
    getMyRequests, 
    updateRequestStatus, 
    getClassDetails, 
    addClassTodo, 
    toggleTodo, 
    completeClass,
    getMyClasses 
} from '../controllers/swap.controller.js';
import { validateTokenMiddleware } from '../middlewares/token.middleware.js';

const router = express.Router();

router.use(validateTokenMiddleware);

// Swap Requests
router.post('/requests', createSwapRequest);
router.get('/requests', getMyRequests); // ?type=sent|received
router.put('/requests/:id', updateRequestStatus);

// Classes
router.get('/classes', getMyClasses);
router.get('/classes/:id', getClassDetails);

// Class Todos
router.post('/classes/:id/todos', addClassTodo);
router.put('/classes/todos/:todoId', toggleTodo);

// Completion
router.post('/classes/:id/complete', completeClass);

export default router;
