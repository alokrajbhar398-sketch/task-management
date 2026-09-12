import { Router } from 'express';
import { registerUser, loginUser, refreshToken } from '../controllers/authController';
import { UserModel } from '../models/User';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', registerUser);

// @route   POST /api/auth/login
// @desc    Authenticate user and get token
// @access  Public
router.post('/login', loginUser);

// @route   POST /api/auth/refresh
// @desc    Refresh user token
// @access  Public
router.post('/refresh', refreshToken);

router.get('/users', authenticate, async (req, res) => {
    try {
        res.json({ users: await UserModel.findAll() });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;
