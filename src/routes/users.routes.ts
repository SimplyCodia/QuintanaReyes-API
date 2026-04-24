import { Router } from 'express';
import {
  getUsers,
  createUser,
  updateUser,
} from '../controllers/users.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth';
import {
  createUserValidation,
  updateUserValidation,
} from '../middleware/validation';

const router = Router();

// GET /api/users — Protected, admin only
router.get('/', authenticate, authorizeAdmin, getUsers);

// POST /api/users — Protected, admin only
router.post('/', authenticate, authorizeAdmin, createUserValidation, createUser);

// PUT /api/users/:id — Protected, admin only
router.put('/:id', authenticate, authorizeAdmin, updateUserValidation, updateUser);

export default router;
