import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const registerUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password, role } = req.body;

        // Validation
        if (!name || !email || !password) {
            res.status(400).json({ message: 'Please enter all required fields.' });
            return;
        }

        // Check if user exists
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create User
        const userId = await UserModel.create({ name, email, role }, hashedPassword);

        res.status(201).json({ message: 'User registered successfully', userId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ message: 'Please provide email and password' });
            return;
        }

        // Find user
        const user = await UserModel.findByEmail(email);
        if (!user || (!user.password)) {
            res.status(400).json({ message: 'Invalid credentials' });
            return;
        }

        // Compare Hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            res.status(400).json({ message: 'Invalid credentials' });
            return;
        }

        // Generate JWT
        const jwtSecret = process.env.JWT_SECRET || 'fallback_secret';
        const token = jwt.sign(
            { id: user.id, role: user.role },
            jwtSecret,
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token } = req.body;
        if (!token) {
            res.status(401).json({ message: 'No token provided' });
            return;
        }

        const jwtSecret = process.env.JWT_SECRET || 'fallback_secret';
        
        let decoded: any;
        try {
            decoded = jwt.verify(token, jwtSecret, { ignoreExpiration: true });
        } catch (err) {
            res.status(401).json({ message: 'Invalid token' });
            return;
        }

        const newToken = jwt.sign(
            { id: decoded.id, role: decoded.role },
            jwtSecret,
            { expiresIn: '1d' }
        );

        res.json({ token: newToken });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
