import { Router } from 'express';
import { login, logout, getMe } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { loginValidation } from '../middleware/validation';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// POST /api/auth/login
router.post('/login', authLimiter, loginValidation, login);

// POST /api/auth/logout
router.post('/logout', authenticate, logout);

// GET /api/auth/me
router.get('/me', authenticate, getMe);

export default router;
