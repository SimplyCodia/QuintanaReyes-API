import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';

// Mock the database pool before importing app
vi.mock('../../config/database', () => ({
  default: {
    query: vi.fn().mockResolvedValue([[], []]),
    execute: vi.fn().mockResolvedValue([[], []]),
    getConnection: vi.fn().mockResolvedValue({
      query: vi.fn().mockResolvedValue([[], []]),
      release: vi.fn(),
    }),
  },
}));

import app from '../../app';

describe('Express app setup', () => {
  describe('GET /api/health', () => {
    it('should return 200 with success message', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        message: 'Quintana Reyes API is running.',
      });
    });
  });

  describe('404 handler', () => {
    it('should return 404 for nonexistent routes', async () => {
      const res = await request(app).get('/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        success: false,
        message: 'Recurso no encontrado.',
      });
    });
  });

  describe('POST /api/auth/login with empty body', () => {
    it('should return 400 validation error', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/solicitudes with empty body', () => {
    it('should return 400 validation error', async () => {
      const res = await request(app)
        .post('/api/solicitudes')
        .send({});

      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Protected routes without auth token', () => {
    it('GET /api/solicitudes should return 401', async () => {
      const res = await request(app).get('/api/solicitudes');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/users should return 401', async () => {
      const res = await request(app).get('/api/users');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/dashboard/stats should return 401', async () => {
      const res = await request(app).get('/api/dashboard/stats');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/audit should return 401', async () => {
      const res = await request(app).get('/api/audit');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
