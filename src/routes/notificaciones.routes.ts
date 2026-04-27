import { Router } from 'express';
import {
  getNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
} from '../controllers/notificaciones.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/notificaciones — Protected
router.get('/', authenticate, getNotificaciones);

// PUT /api/notificaciones/leer-todas — Protected (must be before /:id routes)
router.put('/leer-todas', authenticate, marcarTodasLeidas);

// PUT /api/notificaciones/:id/leer — Protected
router.put('/:id/leer', authenticate, marcarLeida);

export default router;
