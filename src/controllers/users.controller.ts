import { Response } from 'express';
import { ResultSetHeader } from 'mysql2';
import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import pool from '../config/database';
import { AuthRequest, UserRow } from '../types';

const BCRYPT_ROUNDS = 10;

/**
 * GET /api/users
 * Protected, admin only. Returns all users (without password hashes).
 */
export async function getUsers(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const [rows] = await pool.query<UserRow[]>(
      `SELECT id, nombre, email, rol, activo, ultimoAcceso, fechaCreacion
       FROM users
       ORDER BY fechaCreacion DESC`,
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error('[users.getAll] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}

/**
 * POST /api/users
 * Protected, admin only. Creates a new user.
 */
export async function createUser(
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

  const { nombre, email, password, rol } = req.body;

  try {
    // Check for duplicate email
    const [existing] = await pool.query<UserRow[]>(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email],
    );

    if (existing.length > 0) {
      res.status(409).json({
        success: false,
        message: 'Ya existe un usuario con ese email.',
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (nombre, email, passwordHash, rol)
       VALUES (?, ?, ?, ?)`,
      [nombre, email, passwordHash, rol],
    );

    // Audit log
    await pool.query<ResultSetHeader>(
      `INSERT INTO audit_logs (usuarioId, accion, entidad, entidadId, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'CREATE',
        'users',
        result.insertId,
        JSON.stringify({ nombre, email, rol }),
      ],
    );

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        nombre,
        email,
        rol,
        activo: true,
      },
    });
  } catch (error) {
    console.error('[users.create] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}

/**
 * PUT /api/users/:id
 * Protected, admin only. Updates user details.
 */
export async function updateUser(
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
    // Verify user exists
    const [existing] = await pool.query<UserRow[]>(
      'SELECT * FROM users WHERE id = ? LIMIT 1',
      [id],
    );

    if (existing.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Usuario no encontrado.',
      });
      return;
    }

    const { nombre, email, password, rol, activo } = req.body;

    // Check email uniqueness if changing email
    if (email && email !== existing[0].email) {
      const [duplicate] = await pool.query<UserRow[]>(
        'SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1',
        [email, id],
      );
      if (duplicate.length > 0) {
        res.status(409).json({
          success: false,
          message: 'Ya existe otro usuario con ese email.',
        });
        return;
      }
    }

    // Build dynamic UPDATE
    const updates: string[] = [];
    const updateParams: unknown[] = [];
    const changedFields: Record<string, unknown> = {};

    if (nombre !== undefined) {
      updates.push('nombre = ?');
      updateParams.push(nombre);
      changedFields.nombre = { from: existing[0].nombre, to: nombre };
    }
    if (email !== undefined) {
      updates.push('email = ?');
      updateParams.push(email);
      changedFields.email = { from: existing[0].email, to: email };
    }
    if (password !== undefined) {
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      updates.push('passwordHash = ?');
      updateParams.push(passwordHash);
      changedFields.password = 'changed';
    }
    if (rol !== undefined) {
      updates.push('rol = ?');
      updateParams.push(rol);
      changedFields.rol = { from: existing[0].rol, to: rol };
    }
    if (activo !== undefined) {
      updates.push('activo = ?');
      updateParams.push(activo ? 1 : 0);
      changedFields.activo = { from: existing[0].activo, to: activo };
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
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      updateParams,
    );

    // Audit log
    await pool.query<ResultSetHeader>(
      `INSERT INTO audit_logs (usuarioId, accion, entidad, entidadId, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'UPDATE', 'users', id, JSON.stringify(changedFields)],
    );

    // Return updated user
    const [updated] = await pool.query<UserRow[]>(
      'SELECT id, nombre, email, rol, activo, ultimoAcceso, fechaCreacion FROM users WHERE id = ? LIMIT 1',
      [id],
    );

    res.json({
      success: true,
      data: updated[0],
    });
  } catch (error) {
    console.error('[users.update] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}
