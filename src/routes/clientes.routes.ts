import { Router } from 'express';
import {
  getClientes,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente,
} from '../controllers/clientes.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth';
import {
  createClienteValidation,
  updateClienteValidation,
} from '../middleware/validation';

const router = Router();

// GET /api/clientes — Protected
router.get('/', authenticate, getClientes);

// GET /api/clientes/:id — Protected
router.get('/:id', authenticate, getClienteById);

// POST /api/clientes — Protected
router.post('/', authenticate, createClienteValidation, createCliente);

// PUT /api/clientes/:id — Protected
router.put('/:id', authenticate, updateClienteValidation, updateCliente);

// DELETE /api/clientes/:id — Protected, admin only
router.delete('/:id', authenticate, authorizeAdmin, deleteCliente);

export default router;
