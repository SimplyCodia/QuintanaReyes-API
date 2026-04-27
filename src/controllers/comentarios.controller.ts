import { Response } from 'express';
import { ResultSetHeader } from 'mysql2';
import { validationResult } from 'express-validator';
import pool from '../config/database';
import { AuthRequest, ComentarioRow, SolicitudRow, UserRow } from '../types';
import { sendCommentNotification } from '../services/email.service';

/**
 * GET /api/solicitudes/:solicitudId/comentarios
 * Protected. Returns all comments for a solicitud.
 */
export async function getComentarios(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const solicitudId = parseInt(req.params.solicitudId as string);
    if (isNaN(solicitudId) || solicitudId < 1) {
      res.status(400).json({ success: false, message: 'ID de solicitud invalido.' });
      return;
    }

    // Verify solicitud exists
    const [solicitudRows] = await pool.query<SolicitudRow[]>(
      'SELECT id FROM solicitudes WHERE id = ? LIMIT 1',
      [solicitudId],
    );

    if (solicitudRows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada.',
      });
      return;
    }

    const [rows] = await pool.query<ComentarioRow[]>(
      `SELECT c.*, u.nombre as usuarioNombre
       FROM comentarios_solicitud c
       LEFT JOIN users u ON c.usuarioId = u.id
       WHERE c.solicitudId = ?
       ORDER BY c.fechaCreacion ASC`,
      [solicitudId],
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error('[comentarios.getAll] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}

/**
 * POST /api/solicitudes/:solicitudId/comentarios
 * Protected. Creates a comment on a solicitud.
 */
export async function createComentario(
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

  const solicitudId = parseInt(req.params.solicitudId as string);
  if (isNaN(solicitudId) || solicitudId < 1) {
    res.status(400).json({ success: false, message: 'ID de solicitud invalido.' });
    return;
  }

  const { contenido, parentId } = req.body;

  try {
    // Verify solicitud exists
    const [solicitudRows] = await pool.query<SolicitudRow[]>(
      'SELECT id, nombre, asignadoAId FROM solicitudes WHERE id = ? LIMIT 1',
      [solicitudId],
    );

    if (solicitudRows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada.',
      });
      return;
    }

    const solicitud = solicitudRows[0];

    // If parentId provided, validate parent comment exists and belongs to same solicitud
    if (parentId) {
      const [parentRows] = await pool.query<ComentarioRow[]>(
        'SELECT id, solicitudId FROM comentarios_solicitud WHERE id = ? LIMIT 1',
        [parentId],
      );

      if (parentRows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Comentario padre no encontrado.',
        });
        return;
      }

      if (parentRows[0].solicitudId !== solicitudId) {
        res.status(400).json({
          success: false,
          message: 'El comentario padre no pertenece a esta solicitud.',
        });
        return;
      }
    }

    // Insert the comment
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO comentarios_solicitud (solicitudId, usuarioId, contenido, parentId)
       VALUES (?, ?, ?, ?)`,
      [solicitudId, req.user.id, contenido, parentId || null],
    );

    // Fetch the created comment with user name
    const [createdRows] = await pool.query<ComentarioRow[]>(
      `SELECT c.*, u.nombre as usuarioNombre
       FROM comentarios_solicitud c
       LEFT JOIN users u ON c.usuarioId = u.id
       WHERE c.id = ? LIMIT 1`,
      [result.insertId],
    );

    // Audit log
    await pool.query<ResultSetHeader>(
      `INSERT INTO audit_logs (usuarioId, accion, entidad, entidadId, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'CREATE',
        'comentarios_solicitud',
        result.insertId,
        JSON.stringify({ solicitudId, parentId: parentId || null }),
      ],
    );

    // Get the author name for notifications
    const authorName = createdRows[0].usuarioNombre || 'Un usuario';

    // Determine users to notify:
    // 1. All distinct users who have commented on this solicitud (excluding the author)
    // 2. The user assigned to the solicitud (if any, excluding the author)
    const [usersToNotify] = await pool.query<UserRow[]>(
      `SELECT DISTINCT u.id, u.nombre, u.email FROM users u
       INNER JOIN (
         SELECT DISTINCT usuarioId FROM comentarios_solicitud WHERE solicitudId = ? AND usuarioId != ?
         UNION
         SELECT asignadoAId FROM solicitudes WHERE id = ? AND asignadoAId IS NOT NULL AND asignadoAId != ?
       ) AS targets ON u.id = targets.usuarioId`,
      [solicitudId, req.user.id, solicitudId, req.user.id],
    );

    const isReply = !!parentId;
    const mensajePreview = contenido.length > 100 ? contenido.substring(0, 100) + '...' : contenido;
    const tipo = isReply ? 'RESPUESTA' : 'COMENTARIO';
    const titulo = isReply
      ? `${authorName} respondió a tu comentario en solicitud QR-${solicitudId}`
      : `${authorName} comentó en solicitud QR-${solicitudId}`;

    // Create in-app notifications and send emails for each user
    for (const user of usersToNotify) {
      // Insert in-app notification
      await pool.query<ResultSetHeader>(
        `INSERT INTO notificaciones (usuarioId, tipo, titulo, mensaje, entidad, entidadId)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [user.id, tipo, titulo, mensajePreview, 'solicitudes', solicitudId],
      );

      // Send email notification (non-blocking)
      sendCommentNotification({
        recipientEmail: user.email,
        recipientName: user.nombre,
        authorName,
        solicitudId,
        solicitudNombre: solicitud.nombre,
        contenido,
        isReply,
      }).catch((err) =>
        console.error(`[comentarios.create] Email notification to ${user.email} failed:`, err),
      );
    }

    res.status(201).json({
      success: true,
      data: createdRows[0],
    });
  } catch (error) {
    console.error('[comentarios.create] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}
