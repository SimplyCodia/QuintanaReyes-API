import { Router } from 'express';
import {
  getNotificaciones,
  getUnreadCount,
  marcarLeida,
  marcarTodasLeidas,
} from '../controllers/notificaciones.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/notificaciones — Protected
router.get('/', authenticate, getNotificaciones);

// GET /api/notificaciones/unread-count — Protected (lightweight count-only)
router.get('/unread-count', authenticate, getUnreadCount);

// PUT /api/notificaciones/leer-todas — Protected (must be before /:id routes)
router.put('/leer-todas', authenticate, marcarTodasLeidas);

// PUT /api/notificaciones/:id/leer — Protected
router.put('/:id/leer', authenticate, marcarLeida);

export default router;
