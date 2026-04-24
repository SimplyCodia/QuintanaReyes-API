import { Response } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../config/database';
import { AuthRequest } from '../types';

/**
 * GET /api/dashboard/stats
 * Protected. Returns summary statistics for the dashboard.
 */
export async function getStats(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    // Run all stat queries in parallel
    const [
      [totalResult],
      [pendientesResult],
      [enProcesoResult],
      [atendidasResult],
      [archivadosResult],
      [hoyResult],
      [semanaResult],
    ] = await Promise.all([
      pool.query<RowDataPacket[]>(
        'SELECT COUNT(*) as total FROM solicitudes',
      ),
      pool.query<RowDataPacket[]>(
        "SELECT COUNT(*) as total FROM solicitudes WHERE estado = 'PENDIENTE'",
      ),
      pool.query<RowDataPacket[]>(
        "SELECT COUNT(*) as total FROM solicitudes WHERE estado = 'EN_PROCESO'",
      ),
      pool.query<RowDataPacket[]>(
        "SELECT COUNT(*) as total FROM solicitudes WHERE estado = 'ATENDIDA'",
      ),
      pool.query<RowDataPacket[]>(
        "SELECT COUNT(*) as total FROM solicitudes WHERE estado = 'ARCHIVADA'",
      ),
      pool.query<RowDataPacket[]>(
        'SELECT COUNT(*) as total FROM solicitudes WHERE DATE(fechaCreacion) = CURDATE()',
      ),
      pool.query<RowDataPacket[]>(
        'SELECT COUNT(*) as total FROM solicitudes WHERE fechaCreacion >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)',
      ),
    ]);

    res.json({
      success: true,
      data: {
        totalSolicitudes: totalResult[0].total,
        pendientes: pendientesResult[0].total,
        enProceso: enProcesoResult[0].total,
        atendidas: atendidasResult[0].total,
        archivadas: archivadosResult[0].total,
        nuevasHoy: hoyResult[0].total,
        nuevasSemana: semanaResult[0].total,
      },
    });
  } catch (error) {
    console.error('[dashboard.getStats] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}

/**
 * GET /api/dashboard/solicitudes-por-dia
 * Protected. Returns solicitud count grouped by day for the last 30 days.
 */
export async function getSolicitudesPorDia(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const dias = Math.min(
      90,
      Math.max(7, parseInt(req.query.dias as string) || 30),
    );

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT DATE(fechaCreacion) as fecha, COUNT(*) as total
       FROM solicitudes
       WHERE fechaCreacion >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(fechaCreacion)
       ORDER BY fecha ASC`,
      [dias],
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error('[dashboard.solicitudesPorDia] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}

/**
 * GET /api/dashboard/distribucion-por-area
 * Protected. Returns solicitud count grouped by tipoCaso.
 */
export async function getDistribucionPorArea(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT tipoCaso, COUNT(*) as total
       FROM solicitudes
       GROUP BY tipoCaso
       ORDER BY total DESC`,
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error('[dashboard.distribucionPorArea] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}
