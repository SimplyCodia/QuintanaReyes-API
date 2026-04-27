import { Response } from 'express';
import { ResultSetHeader } from 'mysql2';
import { validationResult } from 'express-validator';
import pool from '../config/database';
import { AuthRequest, ClienteRow, SolicitudRow } from '../types';

/**
 * GET /api/clientes
 * Protected. Supports search, pagination.
 */
export async function getClientes(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string) || 20),
    );
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];

    // Search by nombre, email, or telefono
    if (req.query.search) {
      const search = `%${req.query.search}%`;
      conditions.push('(c.nombre LIKE ? OR c.email LIKE ? OR c.telefono LIKE ?)');
      params.push(search, search, search);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countParams = [...params];
    const [countResult] = await pool.query<ClienteRow[]>(
      `SELECT COUNT(*) as total FROM clientes c ${whereClause}`,
      countParams,
    );
    const total = (countResult[0] as unknown as { total: number }).total;

    // Fetch page
    params.push(limit, offset);
    const [rows] = await pool.query<ClienteRow[]>(
      `SELECT c.*,
              (SELECT COUNT(*) FROM solicitudes WHERE clienteId = c.id) as totalSolicitudes
       FROM clientes c
       ${whereClause}
       ORDER BY c.fechaCreacion DESC
       LIMIT ? OFFSET ?`,
      params,
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[clientes.getAll] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}

/**
 * GET /api/clientes/:id
 * Protected. Returns a single client with their solicitudes.
 */
export async function getClienteById(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id) || id < 1) {
      res.status(400).json({ success: false, message: 'ID invalido.' });
      return;
    }

    const [rows] = await pool.query<ClienteRow[]>(
      `SELECT c.*
       FROM clientes c
       WHERE c.id = ? LIMIT 1`,
      [id],
    );

    if (rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Cliente no encontrado.',
      });
      return;
    }

    // Fetch client's solicitudes
    const [solicitudes] = await pool.query<SolicitudRow[]>(
      `SELECT s.*, u.nombre as asignadoNombre
       FROM solicitudes s
       LEFT JOIN users u ON s.asignadoAId = u.id
       WHERE s.clienteId = ?
       ORDER BY s.fechaCreacion DESC`,
      [id],
    );

    res.json({
      success: true,
      data: {
        ...rows[0],
        solicitudes,
      },
    });
  } catch (error) {
    console.error('[clientes.getById] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}

/**
 * POST /api/clientes
 * Protected. Creates a new client.
 */
export async function createCliente(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, message: errors.array()[0].msg });
    return;
  }

  if (!req.user) {
    res.status(401).json({ success: false, message: 'No autenticado.' });
    return;
  }

  const { nombre, telefono, email, notas } = req.body;

  try {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO clientes (nombre, telefono, email, notas)
       VALUES (?, ?, ?, ?)`,
      [nombre, telefono, email, notas || null],
    );

    // Audit log
    await pool.query<ResultSetHeader>(
      `INSERT INTO audit_logs (usuarioId, accion, entidad, entidadId, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'CREATE',
        'clientes',
        result.insertId,
        JSON.stringify({ nombre, email, telefono }),
      ],
    );

    // Return the created client
    const [created] = await pool.query<ClienteRow[]>(
      'SELECT * FROM clientes WHERE id = ? LIMIT 1',
      [result.insertId],
    );

    res.status(201).json({
      success: true,
      data: created[0],
    });
  } catch (error) {
    console.error('[clientes.create] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}

/**
 * PUT /api/clientes/:id
 * Protected. Updates client details.
 */
export async function updateCliente(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, message: errors.array()[0].msg });
    return;
  }

  const id = parseInt(req.params.id as string);
  if (isNaN(id) || id < 1) {
    res.status(400).json({ success: false, message: 'ID invalido.' });
    return;
  }

  if (!req.user) {
    res.status(401).json({ success: false, message: 'No autenticado.' });
    return;
  }

  try {
    // Verify client exists
    const [existing] = await pool.query<ClienteRow[]>(
      'SELECT * FROM clientes WHERE id = ? LIMIT 1',
      [id],
    );

    if (existing.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Cliente no encontrado.',
      });
      return;
    }

    const { nombre, telefono, email, notas } = req.body;

    // Build dynamic UPDATE
    const updates: string[] = [];
    const updateParams: unknown[] = [];
    const changedFields: Record<string, unknown> = {};

    if (nombre !== undefined) {
      updates.push('nombre = ?');
      updateParams.push(nombre);
      changedFields.nombre = { from: existing[0].nombre, to: nombre };
    }
    if (telefono !== undefined) {
      updates.push('telefono = ?');
      updateParams.push(telefono);
      changedFields.telefono = { from: existing[0].telefono, to: telefono };
    }
    if (email !== undefined) {
      updates.push('email = ?');
      updateParams.push(email);
      changedFields.email = { from: existing[0].email, to: email };
    }
    if (notas !== undefined) {
      updates.push('notas = ?');
      updateParams.push(notas === null ? null : notas);
      changedFields.notas = true;
    }

    if (updates.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No se proporcionaron campos para actualizar.',
      });
      return;
    }

    updateParams.push(id);
    await pool.query<ResultSetHeader>(
      `UPDATE clientes SET ${updates.join(', ')} WHERE id = ?`,
      updateParams,
    );

    // Audit log
    await pool.query<ResultSetHeader>(
      `INSERT INTO audit_logs (usuarioId, accion, entidad, entidadId, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'UPDATE', 'clientes', id, JSON.stringify(changedFields)],
    );

    // Return updated client
    const [updated] = await pool.query<ClienteRow[]>(
      'SELECT * FROM clientes WHERE id = ? LIMIT 1',
      [id],
    );

    res.json({
      success: true,
      data: updated[0],
    });
  } catch (error) {
    console.error('[clientes.update] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}

/**
 * DELETE /api/clientes/:id
 * Protected, admin only. Deletes a client.
 */
export async function deleteCliente(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const id = parseInt(req.params.id as string);
  if (isNaN(id) || id < 1) {
    res.status(400).json({ success: false, message: 'ID invalido.' });
    return;
  }

  if (!req.user) {
    res.status(401).json({ success: false, message: 'No autenticado.' });
    return;
  }

  try {
    // Verify client exists
    const [existing] = await pool.query<ClienteRow[]>(
      'SELECT * FROM clientes WHERE id = ? LIMIT 1',
      [id],
    );

    if (existing.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Cliente no encontrado.',
      });
      return;
    }

    await pool.query<ResultSetHeader>(
      'DELETE FROM clientes WHERE id = ?',
      [id],
    );

    // Audit log
    await pool.query<ResultSetHeader>(
      `INSERT INTO audit_logs (usuarioId, accion, entidad, entidadId, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'DELETE',
        'clientes',
        id,
        JSON.stringify({ nombre: existing[0].nombre, email: existing[0].email }),
      ],
    );

    res.json({
      success: true,
      message: 'Cliente eliminado correctamente.',
    });
  } catch (error) {
    console.error('[clientes.delete] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}
