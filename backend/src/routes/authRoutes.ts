import { Router } from 'express';
import { registerUser, loginUser, refreshToken } from '../controllers/authController';

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

export default router;
