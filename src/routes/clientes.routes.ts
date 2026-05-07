import { Router } from 'express';
import {
  getClientes,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente,
} from '../controllers/clientes.controller';
import { authenticate, authorizeAdmin, denyLimited } from '../middleware/auth';
import {
  createClienteValidation,
  updateClienteValidation,
} from '../middleware/validation';

const router = Router();

// GET /api/clientes — Protected (no LIMITED)
router.get('/', authenticate, denyLimited, getClientes);

// GET /api/clientes/:id — Protected (no LIMITED)
router.get('/:id', authenticate, denyLimited, getClienteById);

// POST /api/clientes — Protected (no LIMITED)
router.post('/', authenticate, denyLimited, createClienteValidation, createCliente);

// PUT /api/clientes/:id — Protected (no LIMITED)
router.put('/:id', authenticate, denyLimited, updateClienteValidation, updateCliente);

// DELETE /api/clientes/:id — Protected, admin only
router.delete('/:id', authenticate, authorizeAdmin, deleteCliente);

export default router;
