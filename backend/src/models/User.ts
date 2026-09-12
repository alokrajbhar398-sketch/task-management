import pool, { isDatabaseAvailable } from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getMemoryUsers } from '../config/memoryStore';

export interface IUser {
    id?: number;
    name: string;
    email: string;
    password?: string;
    role?: 'admin' | 'user';
    created_at?: Date;
}

export class UserModel {
    static async findAll(): Promise<Array<Pick<IUser, 'id' | 'name' | 'email' | 'role'>>> {
        if (!isDatabaseAvailable()) {
            return getMemoryUsers().map(({ id, name, email, role }) => ({ id, name, email, role }));
        }

        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT id, name, email, role FROM users ORDER BY name ASC'
        );
        return rows as Array<Pick<IUser, 'id' | 'name' | 'email' | 'role'>>;
    }

    // Basic Table Creation
    static async createTable() {
        if (!isDatabaseAvailable()) {
            return;
        }

        const query = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role ENUM('admin', 'user') DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        try {
            await pool.query(query);
            console.log('✅ Users table ready.');
        } catch (error) {
            console.error('Error creating users table:', error);
        }
    }

    // OOP Principle: Encapsulation of DB logic
    static async findByEmail(email: string): Promise<IUser | null> {
        if (!isDatabaseAvailable()) {
            const normalizedEmail = email.toLowerCase();
            const user = getMemoryUsers().find((entry) => entry.email.toLowerCase() === normalizedEmail);
            return user ? { ...user } : null;
        }

        try {
            const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM users WHERE email = ?', [email]);
            if (rows.length > 0) return rows[0] as IUser;
            return null;
        } catch (error) {
            console.warn('Falling back to in-memory user lookup because MySQL is unavailable.');
            const normalizedEmail = email.toLowerCase();
            const user = getMemoryUsers().find((entry) => entry.email.toLowerCase() === normalizedEmail);
            return user ? { ...user } : null;
        }
    }

    static async create(user: IUser, hashedPassword: string): Promise<number> {
        if (!isDatabaseAvailable()) {
            const users = getMemoryUsers();
            const nextId = users.length > 0 ? Math.max(...users.map((entry) => entry.id)) + 1 : 1;
            const entry = {
                id: nextId,
                name: user.name,
                email: user.email,
                password: hashedPassword,
                role: user.role || 'user',
                created_at: new Date(),
            };
            users.push(entry);
            return entry.id;
        }

        try {
            const { name, email, role } = user;
            const [result] = await pool.query<ResultSetHeader>(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?) ',
                [name, email, hashedPassword, role || 'user']
            );
            return result.insertId;
        } catch (error) {
            console.warn('Falling back to in-memory user creation because MySQL is unavailable.');
            const users = getMemoryUsers();
            const nextId = users.length > 0 ? Math.max(...users.map((entry) => entry.id)) + 1 : 1;
            const entry = {
                id: nextId,
                name: user.name,
                email: user.email,
                password: hashedPassword,
                role: user.role || 'user',
                created_at: new Date(),
            };
            users.push(entry);
            return entry.id;
        }
    }
}
