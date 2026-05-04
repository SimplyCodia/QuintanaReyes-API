import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

/**
 * General rate limiter: 1000 requests per 15 minutes per IP.
 * Skips rate limiting for authenticated requests (protected by JWT).
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    const authHeader = req.headers.authorization;
    return !!authHeader && authHeader.startsWith('Bearer ');
  },
  message: {
    success: false,
    message: 'Demasiadas solicitudes. Intente nuevamente en 15 minutos.',
  },
});

/**
 * Auth rate limiter: 15 login attempts per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      'Demasiados intentos de inicio de sesion. Intente nuevamente en 15 minutos.',
  },
});

/**
 * Contact form rate limiter: 10 submissions per hour per IP.
 */
export const contactFormLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      'Ha enviado demasiados mensajes. Intente nuevamente en una hora.',
  },
});
