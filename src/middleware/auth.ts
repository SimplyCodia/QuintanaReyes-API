import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { AuthRequest, JwtPayload } from '../types';

/**
 * Authenticate requests by verifying the JWT in the Authorization header.
 * Attaches the decoded payload to `req.user`.
 */
export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Token de autenticacion requerido.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: 'Token invalido o expirado.',
    });
  }
}

/**
 * Authorize only users with ADMIN role.
 * Must be used AFTER `authenticate`.
 */
export function authorizeAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'No autenticado.',
    });
    return;
  }

  if (req.user.rol !== 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de administrador.',
    });
    return;
  }

  next();
}
