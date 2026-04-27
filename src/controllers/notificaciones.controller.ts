import { Response } from 'express';
import { ResultSetHeader } from 'mysql2';
import pool from '../config/database';
import { AuthRequest, NotificacionRow } from '../types';

/**
 * GET /api/notificaciones
 * Protected. Returns the current user's notifications.
 * Query params: limit (default 20, max 100), soloNoLeidas (boolean filter).
 */
export async function getNotificaciones(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'No autenticado.' });
    return;
  }

  try {
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string) || 20),
    );
    const soloNoLeidas = req.query.soloNoLeidas === 'true';

    const conditions: string[] = ['usuarioId = ?'];
    const params: unknown[] = [req.user.id];

    if (soloNoLeidas) {
      conditions.push('leida = 0');
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Fetch notifications
    const [rows] = await pool.query<NotificacionRow[]>(
      `SELECT * FROM notificaciones ${whereClause}
       ORDER BY fechaCreacion DESC
       LIMIT ?`,
      [...params, limit],
    );

    // Count total unread
    const [countResult] = await pool.query<NotificacionRow[]>(
      `SELECT COUNT(*) as total FROM notificaciones WHERE usuarioId = ? AND leida = 0`,
      [req.user.id],
    );
    const totalNoLeidas = (countResult[0] as unknown as { total: number }).total;

    res.json({
      success: true,
      data: rows,
      totalNoLeidas,
    });
  } catch (error) {
    console.error('[notificaciones.getAll] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}

/**
 * PUT /api/notificaciones/:id/leer
 * Protected. Mark a single notification as read.
 */
export async function marcarLeida(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'No autenticado.' });
    return;
  }

  const id = parseInt(req.params.id as string);
  if (isNaN(id) || id < 1) {
    res.status(400).json({ success: false, message: 'ID invalido.' });
    return;
  }

  try {
    // Verify notification exists and belongs to the user
    const [rows] = await pool.query<NotificacionRow[]>(
      'SELECT id, usuarioId FROM notificaciones WHERE id = ? LIMIT 1',
      [id],
    );

    if (rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Notificacion no encontrada.',
      });
      return;
    }

    if (rows[0].usuarioId !== req.user.id) {
      res.status(403).json({
        success: false,
        message: 'No tiene permisos para modificar esta notificacion.',
      });
      return;
    }

    await pool.query<ResultSetHeader>(
      'UPDATE notificaciones SET leida = 1 WHERE id = ?',
      [id],
    );

    res.json({
      success: true,
      data: { id, leida: true },
    });
  } catch (error) {
    console.error('[notificaciones.marcarLeida] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}

/**
 * PUT /api/notificaciones/leer-todas
 * Protected. Mark all notifications for the current user as read.
 */
export async function marcarTodasLeidas(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'No autenticado.' });
    return;
  }

  try {
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE notificaciones SET leida = 1 WHERE usuarioId = ? AND leida = 0',
      [req.user.id],
    );

    res.json({
      success: true,
      data: { marcadas: result.affectedRows },
    });
  } catch (error) {
    console.error('[notificaciones.marcarTodasLeidas] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}
