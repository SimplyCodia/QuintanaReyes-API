import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config';
import { generalLimiter } from './middleware/rateLimiter';

// Route imports
import authRoutes from './routes/auth.routes';
import solicitudesRoutes from './routes/solicitudes.routes';
import usersRoutes from './routes/users.routes';
import dashboardRoutes from './routes/dashboard.routes';
import auditRoutes from './routes/audit.routes';
import blogRoutes from './routes/blog.routes';
import clientesRoutes from './routes/clientes.routes';
import notificacionesRoutes from './routes/notificaciones.routes';

const app = express();

// ── Security headers ──────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────
const allowedOrigins = config.corsOrigin.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  }),
);

// ── Request logging ───────────────────────────────────────────────
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// ── Body parsing with size limit ──────────────────────────────────
// Raised to 10mb to accommodate base64-encoded images for the blog module.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── General rate limiter ──────────────────────────────────────────
app.use(generalLimiter);

// ── Health check ──────────────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Quintana Reyes API is running.' });
});

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/solicitudes', solicitudesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/notificaciones', notificacionesRoutes);

// ── 404 handler ───────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Recurso no encontrado.',
  });
});

// ── Global error handler ──────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[error]', err.stack || err.message);

  // Never leak internal error details to the client
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor.',
  });
});

export default app;
