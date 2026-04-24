import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = Router();

// GET /api/audit — Protected, admin only
router.get('/', authenticate, authorizeAdmin, getAuditLogs);

export default router;
