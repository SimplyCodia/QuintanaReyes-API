import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Use vi.hoisted so the mock fns are available when vi.mock factory runs (hoisted)
const { mockQuery, mockExecute, passthrough } = vi.hoisted(() => {
  const pass = (_req: any, _res: any, next: any) => next();
  return {
    mockQuery: vi.fn(),
    mockExecute: vi.fn(),
    passthrough: pass,
  };
});

vi.mock('../../config/database', () => ({
  default: {
    query: mockQuery,
    execute: mockExecute,
    getConnection: vi.fn().mockResolvedValue({
      query: vi.fn().mockResolvedValue([[], []]),
      release: vi.fn(),
    }),
  },
}));

// Mock rate limiters to pass through in tests
vi.mock('../../middleware/rateLimiter', () => ({
  generalLimiter: passthrough,
  authLimiter: passthrough,
  contactFormLimiter: passthrough,
}));

import app from '../../app';

describe('Public solicitud creation endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock: INSERT returns insertId, audit log INSERT succeeds
    mockQuery
      .mockResolvedValueOnce([{ insertId: 1, affectedRows: 1 }, []])  // INSERT solicitud
      .mockResolvedValueOnce([{ insertId: 1, affectedRows: 1 }, []]); // INSERT audit_log
  });

  it('POST /api/solicitudes with valid data should return 201', async () => {
    const validSolicitud = {
      nombre: 'Juan Perez',
      telefono: '+52 555 1234567',
      email: 'juan@example.com',
      tipoCaso: 'CIVIL',
      mensaje: 'Necesito asesoria legal para un caso civil.',
    };

    const res = await request(app)
      .post('/api/solicitudes')
      .send(validSolicitud);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.message).toBeDefined();
  });

  it('POST /api/solicitudes with missing required fields should return validation error', async () => {
    const incompleteSolicitud = {
      nombre: 'Juan Perez',
      // Missing telefono, email, tipoCaso, mensaje
    };

    const res = await request(app)
      .post('/api/solicitudes')
      .send(incompleteSolicitud);

    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBeDefined();
  });

  it('POST /api/solicitudes with invalid email should return validation error', async () => {
    const invalidEmail = {
      nombre: 'Juan Perez',
      telefono: '+52 555 1234567',
      email: 'not-an-email',
      tipoCaso: 'CIVIL',
      mensaje: 'Necesito asesoria legal para un caso civil.',
    };

    const res = await request(app)
      .post('/api/solicitudes')
      .send(invalidEmail);

    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/solicitudes with invalid tipoCaso should return validation error', async () => {
    const invalidTipo = {
      nombre: 'Juan Perez',
      telefono: '+52 555 1234567',
      email: 'juan@example.com',
      tipoCaso: 'INVALID_TYPE',
      mensaje: 'Necesito asesoria legal.',
    };

    const res = await request(app)
      .post('/api/solicitudes')
      .send(invalidTipo);

    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });
});
