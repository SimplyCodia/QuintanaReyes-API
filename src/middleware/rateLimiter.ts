import rateLimit from 'express-rate-limit';

/**
 * General rate limiter: 100 requests per 15 minutes per IP.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas solicitudes. Intente nuevamente en 15 minutos.',
  },
});

/**
 * Auth rate limiter: 5 login attempts per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      'Demasiados intentos de inicio de sesion. Intente nuevamente en 15 minutos.',
  },
});

/**
 * Contact form rate limiter: 3 submissions per hour per IP.
 */
export const contactFormLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      'Ha enviado demasiados mensajes. Intente nuevamente en una hora.',
  },
});
