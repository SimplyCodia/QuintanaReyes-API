import { Router } from 'express';
import {
  getSolicitudes,
  getSolicitudById,
  createSolicitud,
  createSolicitudAdmin,
  updateSolicitud,
} from '../controllers/solicitudes.controller';
import {
  getComentarios,
  createComentario,
} from '../controllers/comentarios.controller';
import { authenticate } from '../middleware/auth';
import {
  createSolicitudValidation,
  createSolicitudAdminValidation,
  updateSolicitudValidation,
  createComentarioValidation,
} from '../middleware/validation';
import { contactFormLimiter } from '../middleware/rateLimiter';

const router = Router();

// GET /api/solicitudes — Protected, with filters
router.get('/', authenticate, getSolicitudes);

// GET /api/solicitudes/:solicitudId/comentarios — Protected
router.get('/:solicitudId/comentarios', authenticate, getComentarios);

// POST /api/solicitudes/:solicitudId/comentarios — Protected
router.post('/:solicitudId/comentarios', authenticate, createComentarioValidation, createComentario);

// GET /api/solicitudes/:id — Protected
router.get('/:id', authenticate, getSolicitudById);

// POST /api/solicitudes — PUBLIC (contact form)
router.post('/', contactFormLimiter, createSolicitudValidation, createSolicitud);

// POST /api/solicitudes/admin — Protected (admin creation)
router.post('/admin', authenticate, createSolicitudAdminValidation, createSolicitudAdmin);

// PUT /api/solicitudes/:id — Protected
router.put('/:id', authenticate, updateSolicitudValidation, updateSolicitud);

export default router;
