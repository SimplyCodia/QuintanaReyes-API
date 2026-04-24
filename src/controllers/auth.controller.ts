import { Response } from 'express';
import { ResultSetHeader } from 'mysql2';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import pool from '../config/database';
import config from '../config';
import { AuthRequest, UserRow, JwtPayload } from '../types';

/**
 * POST /api/auth/login
 */
export async function login(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, message: errors.array()[0].msg });
    return;
  }

  const { email, password } = req.body;

  try {
    const [rows] = await pool.query<UserRow[]>(
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [email],
    );

    if (rows.length === 0) {
      res.status(401).json({
        success: false,
        message: 'Credenciales invalidas.',
      });
      return;
    }

    const user = rows[0];

    if (!user.activo) {
      res.status(401).json({
        success: false,
        message: 'Cuenta desactivada. Contacte al administrador.',
      });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({
        success: false,
        message: 'Credenciales invalidas.',
      });
      return;
    }

    // Update last access timestamp
    await pool.query<ResultSetHeader>(
      'UPDATE users SET ultimoAcceso = NOW() WHERE id = ?',
      [user.id],
    );

    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      rol: user.rol,
    };

    const token = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as string as import('ms').StringValue,
    });

    // Audit log
    await pool.query<ResultSetHeader>(
      'INSERT INTO audit_logs (usuarioId, accion, entidad, entidadId) VALUES (?, ?, ?, ?)',
      [user.id, 'LOGIN', 'users', user.id],
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol,
        },
      },
    });
  } catch (error) {
    console.error('[auth.login] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}

/**
 * POST /api/auth/logout
 */
export async function logout(req: AuthRequest, res: Response): Promise<void> {
  // JWT is stateless; the client simply discards the token.
  // We log the event for audit purposes.
  try {
    if (req.user) {
      await pool.query<ResultSetHeader>(
        'INSERT INTO audit_logs (usuarioId, accion, entidad, entidadId) VALUES (?, ?, ?, ?)',
        [req.user.id, 'LOGOUT', 'users', req.user.id],
      );
    }

    res.json({
      success: true,
      message: 'Sesion cerrada exitosamente.',
    });
  } catch (error) {
    console.error('[auth.logout] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}

/**
 * GET /api/auth/me
 */
export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'No autenticado.' });
    return;
  }

  try {
    const [rows] = await pool.query<UserRow[]>(
      'SELECT id, nombre, email, rol, activo, ultimoAcceso, fechaCreacion FROM users WHERE id = ? LIMIT 1',
      [req.user.id],
    );

    if (rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Usuario no encontrado.',
      });
      return;
    }

    const user = rows[0];

    res.json({
      success: true,
      data: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        activo: user.activo,
        ultimoAcceso: user.ultimoAcceso,
        fechaCreacion: user.fechaCreacion,
      },
    });
  } catch (error) {
    console.error('[auth.getMe] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}
