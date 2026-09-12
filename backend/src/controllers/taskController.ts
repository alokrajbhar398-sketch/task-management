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
        const { title, description } = req.body;
        const userId = req.user.id;

        if (!title) {
            res.status(400).json({ message: 'Title is required' });
            return;
        }

        const taskId = await TaskModel.create({ title, description, user_id: userId });
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
