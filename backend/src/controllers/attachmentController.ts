import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { AttachmentModel, UPLOADS_DIR } from '../models/Attachment';
import pool, { isDatabaseAvailable } from '../config/db';
import { RowDataPacket } from 'mysql2/promise';

const canAccessTask = async (taskId: number, userId: number, role: string): Promise<boolean> => {
  if (role === 'admin') return true;
  if (!isDatabaseAvailable()) return true;
  const [rows] = await pool.query<(RowDataPacket & { user_id: number; assignee_id: number | null })[]>(
    'SELECT user_id, assignee_id FROM tasks WHERE id = ?', [taskId]
  );
  return rows.length > 0 && (rows[0].user_id === userId || rows[0].assignee_id === userId);
};

export const listAttachments = async (req: Request, res: Response): Promise<void> => {
  const taskId = Number(req.params.taskId);
  if (!(await canAccessTask(taskId, req.user.id, req.user.role))) {
    res.status(403).json({ message: 'You do not have access to this task.' });
    return;
  }
  res.json({ attachments: await AttachmentModel.listForTask(taskId) });
};

export const uploadAttachment = async (req: Request, res: Response): Promise<void> => {
  const taskId = Number(req.params.taskId);
  if (!req.file) {
    res.status(400).json({ message: 'A file is required.' });
    return;
  }
  if (!(await canAccessTask(taskId, req.user.id, req.user.role))) {
    fs.rmSync(req.file.path, { force: true });
    res.status(403).json({ message: 'You do not have access to this task.' });
    return;
  }
  const id = await AttachmentModel.create({
    task_id: taskId,
    user_id: req.user.id,
    original_name: req.file.originalname,
    stored_name: req.file.filename,
    mime_type: req.file.mimetype,
    size: req.file.size,
  });
  res.status(201).json({ message: 'Attachment uploaded', attachment: { id, task_id: taskId, original_name: req.file.originalname, mime_type: req.file.mimetype, size: req.file.size } });
};

export const downloadAttachment = async (req: Request, res: Response): Promise<void> => {
  const attachment = await AttachmentModel.findById(Number(req.params.id));
  if (!attachment || !(await canAccessTask(attachment.task_id, req.user.id, req.user.role))) {
    res.status(404).json({ message: 'Attachment not found.' });
    return;
  }
  res.download(path.join(UPLOADS_DIR, attachment.stored_name), attachment.original_name);
};

export const deleteAttachment = async (req: Request, res: Response): Promise<void> => {
  const attachment = await AttachmentModel.findById(Number(req.params.id));
  if (!attachment || !(await canAccessTask(attachment.task_id, req.user.id, req.user.role))) {
    res.status(404).json({ message: 'Attachment not found.' });
    return;
  }
  await AttachmentModel.delete(attachment.id!);
  fs.rmSync(path.join(UPLOADS_DIR, attachment.stored_name), { force: true });
  res.json({ message: 'Attachment deleted' });
};
