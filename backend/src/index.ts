import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import { UserModel } from './models/User';
import { TaskModel } from './models/Task';
import { AttachmentModel } from './models/Attachment';

// Import Routes
import authRoutes from './routes/authRoutes';
import taskRoutes from './routes/taskRoutes';
import reportRoutes from './routes/reportRoutes';
import attachmentRoutes from './routes/attachmentRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // Parses incoming JSON requests

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/attachments', attachmentRoutes);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'API is running' });
});

// Start Server
const startServer = async () => {
    const dbReady = await connectDB();
    await UserModel.createTable();
    await TaskModel.createTable();
    await AttachmentModel.createTable();

    if (!dbReady) {
        console.log('ℹ️ Using in-memory storage mode because MySQL is unavailable.');
    }

    app.listen(PORT, () => {
        console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
};

startServer();
