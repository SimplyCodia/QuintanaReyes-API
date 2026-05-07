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
    // LIMITED users only see stats for their assigned solicitudes
    const isLimited = req.user?.rol === 'LIMITED';
    const filter = isLimited ? ' AND asignadoAId = ?' : '';
    const filterFirst = isLimited ? ' WHERE asignadoAId = ?' : '';
    const filterParams = isLimited ? [req.user!.id] : [];

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
        `SELECT COUNT(*) as total FROM solicitudes${filterFirst}`,
        filterParams,
      ),
      pool.query<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM solicitudes WHERE estado = 'PENDIENTE'${filter}`,
        filterParams,
      ),
      pool.query<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM solicitudes WHERE estado = 'EN_PROCESO'${filter}`,
        filterParams,
      ),
      pool.query<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM solicitudes WHERE estado = 'ATENDIDA'${filter}`,
        filterParams,
      ),
      pool.query<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM solicitudes WHERE estado = 'ARCHIVADA'${filter}`,
        filterParams,
      ),
      pool.query<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM solicitudes WHERE DATE(fechaCreacion) = CURDATE()${filter}`,
        filterParams,
      ),
      pool.query<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM solicitudes WHERE fechaCreacion >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)${filter}`,
        filterParams,
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

    const isLimited = req.user?.rol === 'LIMITED';
    const filter = isLimited ? ' AND asignadoAId = ?' : '';
    const params: unknown[] = [dias];
    if (isLimited) params.push(req.user!.id);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT DATE(fechaCreacion) as fecha, COUNT(*) as total
       FROM solicitudes
       WHERE fechaCreacion >= DATE_SUB(CURDATE(), INTERVAL ? DAY)${filter}
       GROUP BY DATE(fechaCreacion)
       ORDER BY fecha ASC`,
      params,
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
    const isLimited = req.user?.rol === 'LIMITED';
    const filterFirst = isLimited ? ' WHERE asignadoAId = ?' : '';
    const filterParams = isLimited ? [req.user!.id] : [];

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT tipoCaso, COUNT(*) as total
       FROM solicitudes${filterFirst}
       GROUP BY tipoCaso
       ORDER BY total DESC`,
      filterParams,
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
