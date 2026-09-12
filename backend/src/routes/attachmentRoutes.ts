import crypto from 'crypto';
import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/authMiddleware';
import { UPLOADS_DIR } from '../models/Attachment';
import { deleteAttachment, downloadAttachment, listAttachments, uploadAttachment } from '../controllers/attachmentController';

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, callback) => callback(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = /^(image\/|application\/pdf$|text\/plain$|text\/csv$|application\/zip$|application\/msword$|application\/vnd\.openxmlformats-officedocument\.)/;
    callback(null, allowed.test(file.mimetype));
  },
});

const router = Router();
router.use(authenticate);
router.get('/task/:taskId', listAttachments);
router.post('/task/:taskId', upload.single('file'), uploadAttachment);
router.get('/:id/download', downloadAttachment);
router.delete('/:id', deleteAttachment);
export default router;
