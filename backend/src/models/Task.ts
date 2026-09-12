import pool, { isDatabaseAvailable } from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getMemoryTasks } from '../config/memoryStore';

export interface ITask {
    id?: number;
    title: string;
    description: string;
    status?: 'todo' | 'in-progress' | 'done';
    user_id: number;
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
                user_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `;
        try {
            await pool.query(query);
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
            const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM tasks');
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
            const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM tasks WHERE user_id = ?', [user_id]);
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
                user_id: task.user_id,
                created_at: new Date(),
            };
            tasks.push(entry);
            return entry.id;
        }

        try {
            const { title, description, status, user_id } = task;
            const [result] = await pool.query<ResultSetHeader>(
                'INSERT INTO tasks (title, description, status, user_id) VALUES (?, ?, ?, ?) ',
                [title, description, status || 'todo', user_id]
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
                user_id: task.user_id,
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
