import { Request, Response } from 'express';
import { ResultSetHeader } from 'mysql2';
import { validationResult } from 'express-validator';
import pool from '../config/database';
import { AuthRequest, SolicitudRow } from '../types';
import { sendNewSolicitudNotification, sendStatusChangeNotification } from '../services/email.service';

/**
 * GET /api/solicitudes
 * Protected. Supports filters: estado, tipoCaso, asignadoAId, search, page, limit.
 */
export async function getSolicitudes(
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

    // Filter by estado
    if (req.query.estado) {
      const validEstados = ['PENDIENTE', 'EN_PROCESO', 'ATENDIDA', 'ARCHIVADA'];
      if (validEstados.includes(req.query.estado as string)) {
        conditions.push('s.estado = ?');
        params.push(req.query.estado);
      }
    }

    // Filter by tipoCaso
    if (req.query.tipoCaso) {
      const validTipos = [
        'FAMILIA',
        'ADMINISTRATIVO',
        'CORPORATIVO',
        'CIVIL',
        'PENAL',
        'LABORAL',
        'MIGRATORIO',
      ];
      if (validTipos.includes(req.query.tipoCaso as string)) {
        conditions.push('s.tipoCaso = ?');
        params.push(req.query.tipoCaso);
      }
    }

    // Filter by assigned user
    if (req.query.asignadoAId) {
      const assignedId = parseInt(req.query.asignadoAId as string);
      if (!isNaN(assignedId) && assignedId > 0) {
        conditions.push('s.asignadoAId = ?');
        params.push(assignedId);
      }
    }

    // Search by nombre, email, or telefono
    if (req.query.search) {
      const search = `%${req.query.search}%`;
      conditions.push('(s.nombre LIKE ? OR s.email LIKE ? OR s.telefono LIKE ?)');
      params.push(search, search, search);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countParams = [...params];
    const [countResult] = await pool.query<SolicitudRow[]>(
      `SELECT COUNT(*) as total FROM solicitudes s ${whereClause}`,
      countParams,
    );
    const total = (countResult[0] as unknown as { total: number }).total;

    // Fetch page
    params.push(limit, offset);
    const [rows] = await pool.query<SolicitudRow[]>(
      `SELECT s.*, u.nombre as asignadoNombre
       FROM solicitudes s
       LEFT JOIN users u ON s.asignadoAId = u.id
       ${whereClause}
       ORDER BY s.fechaCreacion DESC
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
    console.error('[solicitudes.getAll] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}

/**
 * GET /api/solicitudes/:id
 * Protected. Returns a single solicitud with its state history.
 */
export async function getSolicitudById(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id) || id < 1) {
      res.status(400).json({ success: false, message: 'ID invalido.' });
      return;
    }

    const [rows] = await pool.query<SolicitudRow[]>(
      `SELECT s.*, u.nombre as asignadoNombre
       FROM solicitudes s
       LEFT JOIN users u ON s.asignadoAId = u.id
       WHERE s.id = ? LIMIT 1`,
      [id],
    );

    if (rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada.',
      });
      return;
    }

    // Fetch state history
    const [historial] = await pool.query(
      `SELECT h.*, u.nombre as usuarioNombre
       FROM historial_estado h
       LEFT JOIN users u ON h.usuarioId = u.id
       WHERE h.solicitudId = ?
       ORDER BY h.fecha DESC`,
      [id],
    );

    res.json({
      success: true,
      data: {
        ...rows[0],
        historial,
      },
    });
  } catch (error) {
    console.error('[solicitudes.getById] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}

/**
 * POST /api/solicitudes
 * PUBLIC - Contact form submission. No authentication required.
 */
export async function createSolicitud(
  req: Request,
  res: Response,
): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, message: errors.array()[0].msg });
    return;
  }

  const { nombre, telefono, email, tipoCaso, mensaje, origen } = req.body;

  try {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO solicitudes (nombre, telefono, email, tipoCaso, mensaje, origen)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, telefono, email, tipoCaso, mensaje, origen || 'web'],
    );

    // Audit log (no user since it is public)
    await pool.query<ResultSetHeader>(
      `INSERT INTO audit_logs (usuarioId, accion, entidad, entidadId, metadata)
       VALUES (NULL, ?, ?, ?, ?)`,
      [
        'CREATE',
        'solicitudes',
        result.insertId,
        JSON.stringify({ nombre, email, tipoCaso, origen: origen || 'web' }),
      ],
    );

    // Send email notification (non-blocking)
    sendNewSolicitudNotification({ id: result.insertId, nombre, email, telefono, tipoCaso, mensaje }).catch(
      (err) => console.error('[solicitudes.create] Email notification failed:', err),
    );

    res.status(201).json({
      success: true,
      message:
        'Su solicitud ha sido recibida. Nos pondremos en contacto pronto.',
      data: { id: result.insertId },
    });
  } catch (error) {
    console.error('[solicitudes.create] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}

/**
 * PUT /api/solicitudes/:id
 * Protected. Updates estado, notasInternas, asignadoAId.
 */
export async function updateSolicitud(
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
    // Get current solicitud
    const [existing] = await pool.query<SolicitudRow[]>(
      'SELECT * FROM solicitudes WHERE id = ? LIMIT 1',
      [id],
    );

    if (existing.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada.',
      });
      return;
    }

    const current = existing[0];
    const { estado, notasInternas, asignadoAId, comentario } = req.body;

    // Build dynamic UPDATE
    const updates: string[] = [];
    const updateParams: unknown[] = [];

    if (estado !== undefined) {
      updates.push('estado = ?');
      updateParams.push(estado);
    }
    if (notasInternas !== undefined) {
      updates.push('notasInternas = ?');
      updateParams.push(notasInternas);
    }
    if (asignadoAId !== undefined) {
      updates.push('asignadoAId = ?');
      updateParams.push(asignadoAId === null ? null : asignadoAId);
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
      `UPDATE solicitudes SET ${updates.join(', ')} WHERE id = ?`,
      updateParams,
    );

    // Record state change in history if estado changed
    if (estado !== undefined && estado !== current.estado) {
      await pool.query<ResultSetHeader>(
        `INSERT INTO historial_estado (solicitudId, estadoAnterior, estadoNuevo, usuarioId, comentario)
         VALUES (?, ?, ?, ?, ?)`,
        [id, current.estado, estado, req.user.id, comentario || null],
      );

      // Notify firm + client about status change (non-blocking)
      sendStatusChangeNotification({
        id,
        nombre: current.nombre,
        email: current.email,
        estadoAnterior: current.estado,
        estadoNuevo: estado,
      }).catch((err) => console.error('[solicitudes.update] Status change email failed:', err));
    }

    // Audit log
    const metadata: Record<string, unknown> = {};
    if (estado !== undefined) metadata.estado = { from: current.estado, to: estado };
    if (notasInternas !== undefined) metadata.notasInternas = true;
    if (asignadoAId !== undefined)
      metadata.asignadoAId = { from: current.asignadoAId, to: asignadoAId };

    await pool.query<ResultSetHeader>(
      `INSERT INTO audit_logs (usuarioId, accion, entidad, entidadId, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'UPDATE', 'solicitudes', id, JSON.stringify(metadata)],
    );

    // Return the updated record
    const [updated] = await pool.query<SolicitudRow[]>(
      `SELECT s.*, u.nombre as asignadoNombre
       FROM solicitudes s
       LEFT JOIN users u ON s.asignadoAId = u.id
       WHERE s.id = ? LIMIT 1`,
      [id],
    );

    res.json({
      success: true,
      data: updated[0],
    });
  } catch (error) {
    console.error('[solicitudes.update] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}
