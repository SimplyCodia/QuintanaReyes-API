import { Router } from 'express';
import {
  getStats,
  getSolicitudesPorDia,
  getDistribucionPorArea,
} from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/dashboard/stats — Protected (LIMITED sees only their data)
router.get('/stats', authenticate, getStats);

// GET /api/dashboard/solicitudes-por-dia — Protected (LIMITED sees only their data)
router.get('/solicitudes-por-dia', authenticate, getSolicitudesPorDia);

// GET /api/dashboard/distribucion-por-area — Protected (LIMITED sees only their data)
router.get('/distribucion-por-area', authenticate, getDistribucionPorArea);

export default router;
