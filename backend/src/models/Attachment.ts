import fs from 'fs';
import path from 'path';
import pool, { isDatabaseAvailable } from '../config/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getMemoryAttachments } from '../config/memoryStore';

export interface IAttachment {
  id?: number;
  task_id: number;
  user_id: number;
  original_name: string;
  stored_name: string;
  mime_type: string;
  size: number;
  created_at?: Date;
}

export const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

export class AttachmentModel {
  static async createTable(): Promise<void> {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    if (!isDatabaseAvailable()) return;
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attachments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT NOT NULL,
        user_id INT NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        stored_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        size INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  }

  static async listForTask(taskId: number): Promise<IAttachment[]> {
    if (!isDatabaseAvailable()) {
      return getMemoryAttachments().filter((item) => item.task_id === taskId).map((item) => ({ ...item }));
    }
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, task_id, user_id, original_name, mime_type, size, created_at FROM attachments WHERE task_id = ? ORDER BY created_at DESC',
      [taskId]
    );
    return rows as IAttachment[];
  }

  static async create(attachment: IAttachment): Promise<number> {
    if (!isDatabaseAvailable()) {
      const items = getMemoryAttachments();
      const id = items.length ? Math.max(...items.map((item) => item.id)) + 1 : 1;
      items.push({ ...attachment, id, created_at: new Date() });
      return id;
    }
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO attachments (task_id, user_id, original_name, stored_name, mime_type, size) VALUES (?, ?, ?, ?, ?, ?)',
      [attachment.task_id, attachment.user_id, attachment.original_name, attachment.stored_name, attachment.mime_type, attachment.size]
    );
    return result.insertId;
  }

  static async findById(id: number): Promise<IAttachment | null> {
    if (!isDatabaseAvailable()) {
      return getMemoryAttachments().find((item) => item.id === id) || null;
    }
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM attachments WHERE id = ?', [id]);
    return (rows[0] as IAttachment | undefined) || null;
  }

  static async delete(id: number): Promise<boolean> {
    if (!isDatabaseAvailable()) {
      const items = getMemoryAttachments();
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) return false;
      items.splice(index, 1);
      return true;
    }
    const [result] = await pool.query<ResultSetHeader>('DELETE FROM attachments WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}
