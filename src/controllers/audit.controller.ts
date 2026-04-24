import { Response } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../config/database';
import { AuthRequest, AuditLogRow } from '../types';

/**
 * GET /api/audit
 * Protected, admin only. Returns audit log entries with pagination and filters.
 */
export async function getAuditLogs(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string) || 50),
    );
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];

    // Filter by entidad
    if (req.query.entidad) {
      conditions.push('a.entidad = ?');
      params.push(req.query.entidad);
    }

    // Filter by accion
    if (req.query.accion) {
      conditions.push('a.accion = ?');
      params.push(req.query.accion);
    }

    // Filter by usuarioId
    if (req.query.usuarioId) {
      const uid = parseInt(req.query.usuarioId as string);
      if (!isNaN(uid) && uid > 0) {
        conditions.push('a.usuarioId = ?');
        params.push(uid);
      }
    }

    // Filter by date range
    if (req.query.desde) {
      conditions.push('a.fecha >= ?');
      params.push(req.query.desde);
    }
    if (req.query.hasta) {
      conditions.push('a.fecha <= ?');
      params.push(req.query.hasta);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countParams = [...params];
    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM audit_logs a ${whereClause}`,
      countParams,
    );
    const total = countResult[0].total;

    // Fetch page
    params.push(limit, offset);
    const [rows] = await pool.query<AuditLogRow[]>(
      `SELECT a.*, u.nombre as usuarioNombre, u.email as usuarioEmail
       FROM audit_logs a
       LEFT JOIN users u ON a.usuarioId = u.id
       ${whereClause}
       ORDER BY a.fecha DESC
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
    console.error('[audit.getAll] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}
