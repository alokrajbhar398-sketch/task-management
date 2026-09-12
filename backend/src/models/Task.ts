import pool, { isDatabaseAvailable } from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getMemoryTasks } from '../config/memoryStore';

export interface ITask {
    id?: number;
    title: string;
    description: string;
    status?: 'todo' | 'in-progress' | 'done';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    user_id: number;
    assignee_id?: number | null;
    assignee_name?: string | null;
    due_date?: Date | string | null;
    created_at?: Date;
}

export class TaskModel {
    static async createTable() {
        if (!isDatabaseAvailable()) {
            return;
        }

        const query = `
            CREATE TABLE IF NOT EXISTS tasks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                description TEXT,
                status ENUM('todo', 'in-progress', 'done') DEFAULT 'todo',
                priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
                user_id INT NOT NULL,
                assignee_id INT NULL,
                due_date DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `;
        try {
            await pool.query(query);
            try {
                await pool.query('ALTER TABLE tasks ADD COLUMN due_date DATETIME NULL');
            } catch (error) {
                if ((error as { code?: string }).code !== 'ER_DUP_FIELDNAME') {
                    throw error;
                }
            }
            try {
                await pool.query("ALTER TABLE tasks ADD COLUMN priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium'");
            } catch (error) {
                if ((error as { code?: string }).code !== 'ER_DUP_FIELDNAME') {
                    throw error;
                }
            }
            try {
                await pool.query('ALTER TABLE tasks ADD COLUMN assignee_id INT NULL');
            } catch (error) {
                if ((error as { code?: string }).code !== 'ER_DUP_FIELDNAME') {
                    throw error;
                }
            }
            console.log('✅ Tasks table ready.');
        } catch (error) {
            console.error('Error creating tasks table:', error);
        }
    }

    static async findAll(): Promise<ITask[]> {
        if (!isDatabaseAvailable()) {
            return getMemoryTasks().map((task) => ({ ...task }));
        }

        try {
            const [rows] = await pool.query<RowDataPacket[]>(
                'SELECT tasks.*, assignee.name AS assignee_name FROM tasks LEFT JOIN users AS assignee ON assignee.id = tasks.assignee_id'
            );
            return rows as ITask[];
        } catch (error) {
            console.warn('Falling back to in-memory task lookup because MySQL is unavailable.');
            return getMemoryTasks().map((task) => ({ ...task }));
        }
    }

    static async findByUserId(user_id: number): Promise<ITask[]> {
        if (!isDatabaseAvailable()) {
            return getMemoryTasks().filter((task) => task.user_id === user_id).map((task) => ({ ...task }));
        }

        try {
            const [rows] = await pool.query<RowDataPacket[]>(
                'SELECT tasks.*, assignee.name AS assignee_name FROM tasks LEFT JOIN users AS assignee ON assignee.id = tasks.assignee_id WHERE tasks.user_id = ? OR tasks.assignee_id = ?',
                [user_id, user_id]
            );
            return rows as ITask[];
        } catch (error) {
            console.warn('Falling back to in-memory task lookup because MySQL is unavailable.');
            return getMemoryTasks().filter((task) => task.user_id === user_id).map((task) => ({ ...task }));
        }
    }

    static async create(task: ITask): Promise<number> {
        if (!isDatabaseAvailable()) {
            const tasks = getMemoryTasks();
            const nextId = tasks.length > 0 ? Math.max(...tasks.map((entry) => entry.id)) + 1 : 1;
            const entry = {
                id: nextId,
                title: task.title,
                description: task.description,
                status: task.status || 'todo',
                priority: task.priority || 'medium',
                user_id: task.user_id,
                assignee_id: task.assignee_id || null,
                due_date: task.due_date ? new Date(task.due_date) : undefined,
                created_at: new Date(),
            };
            tasks.push(entry);
            return entry.id;
        }

        try {
            const { title, description, status, priority, user_id, assignee_id } = task;
            const [result] = await pool.query<ResultSetHeader>(
                'INSERT INTO tasks (title, description, status, priority, user_id, assignee_id, due_date) VALUES (?, ?, ?, ?, ?, ?, ?) ',
                [title, description, status || 'todo', priority || 'medium', user_id, assignee_id || null, task.due_date || null]
            );
            return result.insertId;
        } catch (error) {
            console.warn('Falling back to in-memory task creation because MySQL is unavailable.');
            const tasks = getMemoryTasks();
            const nextId = tasks.length > 0 ? Math.max(...tasks.map((entry) => entry.id)) + 1 : 1;
            const entry = {
                id: nextId,
                title: task.title,
                description: task.description,
                status: task.status || 'todo',
                priority: task.priority || 'medium',
                user_id: task.user_id,
                assignee_id: task.assignee_id || null,
                due_date: task.due_date ? new Date(task.due_date) : undefined,
                created_at: new Date(),
            };
            tasks.push(entry);
            return entry.id;
        }
    }

    static async updateStatus(id: number, status: string): Promise<boolean> {
        if (!isDatabaseAvailable()) {
            const tasks = getMemoryTasks();
            const target = tasks.find((task) => task.id === id);
            if (!target) {
                return false;
            }
            target.status = status as 'todo' | 'in-progress' | 'done';
            return true;
        }

        try {
            const [result] = await pool.query<ResultSetHeader>(
                'UPDATE tasks SET status = ? WHERE id = ?',
                [status, id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            const tasks = getMemoryTasks();
            const target = tasks.find((task) => task.id === id);
            if (!target) {
                return false;
            }
            target.status = status as 'todo' | 'in-progress' | 'done';
            return true;
        }
    }

    static async updateDetails(id: number, title: string, description: string, dueDate: string | null, priority: string, assigneeId: number | null, userId: number, isAdmin: boolean): Promise<boolean> {
        if (!isDatabaseAvailable()) {
            const task = getMemoryTasks().find((entry) => entry.id === id);
            if (!task || (!isAdmin && task.user_id !== userId)) {
                return false;
            }
            task.title = title;
            task.description = description;
            task.due_date = dueDate ? new Date(dueDate) : undefined;
            task.priority = priority as 'low' | 'medium' | 'high' | 'urgent';
            task.assignee_id = assigneeId;
            return true;
        }

        try {
            const ownershipClause = isAdmin ? '' : ' AND user_id = ?';
            const params = isAdmin ? [title, description, dueDate, priority, assigneeId, id] : [title, description, dueDate, priority, assigneeId, id, userId];
            const [result] = await pool.query<ResultSetHeader>(
                `UPDATE tasks SET title = ?, description = ?, due_date = ?, priority = ?, assignee_id = ? WHERE id = ?${ownershipClause}`,
                params
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating task details:', error);
            return false;
        }
    }

    static async delete(id: number): Promise<boolean> {
        if (!isDatabaseAvailable()) {
            const tasks = getMemoryTasks();
            const initialLength = tasks.length;
            const filtered = tasks.filter((task) => task.id !== id);
            if (filtered.length === initialLength) {
                return false;
            }
            tasks.splice(0, tasks.length, ...filtered);
            return true;
        }

        try {
            const [result] = await pool.query<ResultSetHeader>(
                'DELETE FROM tasks WHERE id = ?',
                [id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            const tasks = getMemoryTasks();
            const initialLength = tasks.length;
            const filtered = tasks.filter((task) => task.id !== id);
            if (filtered.length === initialLength) {
                return false;
            }
            tasks.splice(0, tasks.length, ...filtered);
            return true;
        }
    }
}
