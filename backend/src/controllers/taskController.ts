import { Request, Response } from 'express';
import { TaskModel } from '../models/Task';

export const getTasks = async (req: Request, res: Response): Promise<void> => {
    try {
        // Find tasks related to current user (req.user from middleware)
        const userId = req.user.id;
        
        // For admins, maybe find all tasks. But let's keep it simple: fetch their own tasks
        // Or if admin, fetch all
        let tasks = [];
        if (req.user.role === 'admin') {
            tasks = await TaskModel.findAll();
        } else {
            tasks = await TaskModel.findByUserId(userId);
        }

        res.json({ tasks });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const createTask = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, dueDate, priority = 'medium', assigneeId = null } = req.body;
        const userId = req.user.id;

        if (!title) {
            res.status(400).json({ message: 'Title is required' });
            return;
        }

        if (dueDate !== undefined && dueDate !== null && Number.isNaN(Date.parse(dueDate))) {
            res.status(400).json({ message: 'Due date must be valid' });
            return;
        }
        if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
            res.status(400).json({ message: 'Priority must be low, medium, high, or urgent' });
            return;
        }
        if (assigneeId !== null && (!Number.isInteger(assigneeId) || assigneeId < 1)) {
            res.status(400).json({ message: 'Assignee must be a valid user' });
            return;
        }

        const taskId = await TaskModel.create({ title, description, due_date: dueDate || null, priority, assignee_id: assigneeId, user_id: userId });
        res.status(201).json({ message: 'Task created', taskId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const updateTaskStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const success = await TaskModel.updateStatus(Number(id), status);
        if (success) {
            res.json({ message: 'Status updated' });
        } else {
            res.status(404).json({ message: 'Task not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const updateTaskDetails = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { title, description, dueDate, priority = 'medium', assigneeId = null } = req.body;

        if (typeof title !== 'string' || !title.trim()) {
            res.status(400).json({ message: 'Title is required' });
            return;
        }

        if (description !== undefined && typeof description !== 'string') {
            res.status(400).json({ message: 'Description must be text' });
            return;
        }

        if (dueDate !== undefined && dueDate !== null && Number.isNaN(Date.parse(dueDate))) {
            res.status(400).json({ message: 'Due date must be valid' });
            return;
        }
        if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
            res.status(400).json({ message: 'Priority must be low, medium, high, or urgent' });
            return;
        }
        if (assigneeId !== null && (!Number.isInteger(assigneeId) || assigneeId < 1)) {
            res.status(400).json({ message: 'Assignee must be a valid user' });
            return;
        }

        const success = await TaskModel.updateDetails(
            Number(id),
            title.trim(),
            typeof description === 'string' ? description.trim() : '',
            dueDate || null,
            priority,
            assigneeId,
            req.user.id,
            req.user.role === 'admin'
        );

        if (success) {
            res.json({ message: 'Task updated' });
        } else {
            res.status(404).json({ message: 'Task not found or access denied' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const deleteTask = async (req: Request, res: Response): Promise<void> => {
    try {
        // Allow admin only to delete any task (RBAC demo)
        if (req.user.role !== 'admin') {
            res.status(403).json({ message: 'Only admins can delete tasks.' });
            return;
        }

        const { id } = req.params;
        const success = await TaskModel.delete(Number(id));
        if (success) {
            res.json({ message: 'Task deleted' });
        } else {
            res.status(404).json({ message: 'Task not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
