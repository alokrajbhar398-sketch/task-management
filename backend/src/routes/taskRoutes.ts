import { Router } from 'express';
import { getTasks, createTask, updateTaskStatus, updateTaskDetails, deleteTask } from '../controllers/taskController';
import { authenticate, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

// @route   GET /api/tasks
// @desc    Get all tasks for user
// @access  Private
router.get('/', authenticate, getTasks);

// @route   POST /api/tasks
// @desc    Create a task
// @access  Private
router.post('/', authenticate, createTask);

// @route   PATCH /api/tasks/:id
// @desc    Update task status
// @access  Private
router.patch('/:id', authenticate, updateTaskStatus);

// @route   PUT /api/tasks/:id
// @desc    Update a task title and description
// @access  Private (owner or admin)
router.put('/:id', authenticate, updateTaskDetails);

// @route   DELETE /api/tasks/:id
// @desc    Delete a task (Admin only)
// @access  Private
router.delete('/:id', authenticate, authorizeRole(['admin']), deleteTask);

export default router;
