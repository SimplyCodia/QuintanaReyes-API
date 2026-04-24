import { Router } from 'express';
import {
  getSolicitudes,
  getSolicitudById,
  createSolicitud,
  updateSolicitud,
} from '../controllers/solicitudes.controller';
import { authenticate } from '../middleware/auth';
import {
  createSolicitudValidation,
  updateSolicitudValidation,
} from '../middleware/validation';
import { contactFormLimiter } from '../middleware/rateLimiter';

const router = Router();

// GET /api/solicitudes — Protected, with filters
router.get('/', authenticate, getSolicitudes);

// GET /api/solicitudes/:id — Protected
router.get('/:id', authenticate, getSolicitudById);

// POST /api/solicitudes — PUBLIC (contact form)
router.post('/', contactFormLimiter, createSolicitudValidation, createSolicitud);

// PUT /api/solicitudes/:id — Protected
router.put('/:id', authenticate, updateSolicitudValidation, updateSolicitud);

export default router;
