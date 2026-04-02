import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { addClassTodo, toggleTodo, completeClass, getClassDetails } from '../services/classroom.service';

export const useSwapClassroomTasks = (classId) => {
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskAssignedTo, setTaskAssignedTo] = useState('');
    const [taskDueDate, setTaskDueDate] = useState('');
    const [savingTask, setSavingTask] = useState(false);
    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);

    // Build task description with assignee metadata
    const buildTaskDescription = (assignedUserId) => {
        if (!assignedUserId) return null;
        return `[ASSIGNEE:${assignedUserId}]`;
    };

    // Add todo
    const handleAddTodo = useCallback(async (event, setSwapClass) => {
        event.preventDefault();
        const title = taskTitle.trim();
        if (!title) {
            toast.error('Task title is required');
            return;
        }

        const assignedUserId = taskAssignedTo ? Number(taskAssignedTo) : null;
        const dueDateIso = taskDueDate ? new Date(`${taskDueDate}T09:00:00`).toISOString() : null;

        try {
            setSavingTask(true);
            const todo = await addClassTodo(classId, {
                title,
                dueDate: dueDateIso,
                description: buildTaskDescription(assignedUserId)
            });
            setSwapClass((prev) => ({
                ...prev,
                todos: [...(prev.todos || []), todo]
            }));
            setTaskTitle('');
            setTaskAssignedTo('');
            setTaskDueDate('');
            setShowTaskForm(false);
            toast.success('Task added');
        } catch (_) {
            toast.error('Failed to add task');
        } finally {
            setSavingTask(false);
        }
    }, [classId, taskTitle, taskAssignedTo, taskDueDate]);

    // Toggle todo completion
    const handleToggleTodo = useCallback(async (todoId, currentStatus, setSwapClass) => {
        try {
            await toggleTodo(todoId, !currentStatus);
            setSwapClass((prev) => ({
                ...prev,
                todos: (prev.todos || []).map((todo) => (
                    todo.id === todoId ? { ...todo, isCompleted: !currentStatus } : todo
                ))
            }));
        } catch (_) {
            toast.error('Failed to update task');
        }
    }, []);

    // Open complete dialog
    const handleCompleteClass = useCallback(() => {
        setCompleteDialogOpen(true);
    }, []);

    // Confirm class completion
    const handleConfirmComplete = useCallback(async (setSwapClass, hasReviewedClass, getClassReviews, setMyReviewStatus, setClassReviews) => {
        setCompleteDialogOpen(false);
        try {
            await completeClass(classId);
            toast.success('Class marked as complete');

            const data = await getClassDetails(classId);
            setSwapClass(data);

            if (data?.status === 'COMPLETED') {
                const [reviewStatus, reviews] = await Promise.all([
                    hasReviewedClass(classId),
                    getClassReviews(classId)
                ]);
                setMyReviewStatus(reviewStatus);
                setClassReviews(reviews || []);
            }
        } catch (_) {
            toast.error('Error completing class');
        }
    }, [classId]);

    return {
        // State
        showTaskForm,
        taskTitle,
        taskAssignedTo,
        taskDueDate,
        savingTask,
        completeDialogOpen,
        // Setters
        setShowTaskForm,
        setTaskTitle,
        setTaskAssignedTo,
        setTaskDueDate,
        setSavingTask,
        setCompleteDialogOpen,
        // Handlers
        buildTaskDescription,
        handleAddTodo,
        handleToggleTodo,
        handleCompleteClass,
        handleConfirmComplete
    };
};
