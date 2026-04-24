import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Response } from 'express';
import { AuthRequest } from '../../../types';

// Use vi.hoisted so the mock fns are available when vi.mock factory runs (hoisted)
const { mockQuery, mockCompare, mockSign } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockCompare: vi.fn(),
  mockSign: vi.fn().mockReturnValue('mock-jwt-token'),
}));

// Mock the database pool
vi.mock('../../../config/database', () => ({
  default: {
    query: mockQuery,
    execute: vi.fn(),
  },
}));

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    compare: mockCompare,
    hash: vi.fn(),
  },
}));

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: mockSign,
    verify: vi.fn(),
  },
}));

// Mock express-validator
vi.mock('express-validator', () => ({
  validationResult: vi.fn().mockReturnValue({
    isEmpty: () => true,
    array: () => [],
  }),
  body: vi.fn().mockReturnValue({
    trim: vi.fn().mockReturnThis(),
    isEmail: vi.fn().mockReturnThis(),
    withMessage: vi.fn().mockReturnThis(),
    normalizeEmail: vi.fn().mockReturnThis(),
    notEmpty: vi.fn().mockReturnThis(),
    isLength: vi.fn().mockReturnThis(),
    isIn: vi.fn().mockReturnThis(),
    optional: vi.fn().mockReturnThis(),
    isInt: vi.fn().mockReturnThis(),
    isBoolean: vi.fn().mockReturnThis(),
    toInt: vi.fn().mockReturnThis(),
    matches: vi.fn().mockReturnThis(),
    escape: vi.fn().mockReturnThis(),
  }),
}));

import { login } from '../../../controllers/auth.controller';

function createMockRequest(body: Record<string, unknown> = {}): AuthRequest {
  return {
    body,
    headers: {},
  } as AuthRequest;
}

function createMockResponse(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe('Auth Controller - login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mockSign default return value after clearAllMocks
    mockSign.mockReturnValue('mock-jwt-token');
  });

  it('should return user and token with valid credentials', async () => {
    const mockUser = {
      id: 1,
      nombre: 'Admin User',
      email: 'admin@test.com',
      passwordHash: '$2a$10$hashedpassword',
      rol: 'ADMIN',
      activo: true,
      ultimoAcceso: null,
      fechaCreacion: new Date(),
    };

    // SELECT user query
    mockQuery
      .mockResolvedValueOnce([[mockUser], []])
      // UPDATE ultimoAcceso
      .mockResolvedValueOnce([{ affectedRows: 1 }, []])
      // INSERT audit_log
      .mockResolvedValueOnce([{ insertId: 1 }, []]);

    mockCompare.mockResolvedValue(true);

    const req = createMockRequest({
      email: 'admin@test.com',
      password: 'password123',
    });
    const res = createMockResponse();

    await login(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          token: 'mock-jwt-token',
          user: expect.objectContaining({
            id: 1,
            nombre: 'Admin User',
            email: 'admin@test.com',
            rol: 'ADMIN',
          }),
        }),
      }),
    );
  });

  it('should return 401 with invalid email (user not found)', async () => {
    // SELECT returns empty result
    mockQuery.mockResolvedValueOnce([[], []]);

    const req = createMockRequest({
      email: 'nonexistent@test.com',
      password: 'password123',
    });
    const res = createMockResponse();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Credenciales invalidas.',
    });
  });

  it('should return 401 with wrong password', async () => {
    const mockUser = {
      id: 1,
      nombre: 'Admin User',
      email: 'admin@test.com',
      passwordHash: '$2a$10$hashedpassword',
      rol: 'ADMIN',
      activo: true,
      ultimoAcceso: null,
      fechaCreacion: new Date(),
    };

    // SELECT user query
    mockQuery.mockResolvedValueOnce([[mockUser], []]);

    // bcrypt.compare returns false for wrong password
    mockCompare.mockResolvedValue(false);

    const req = createMockRequest({
      email: 'admin@test.com',
      password: 'wrongpassword',
    });
    const res = createMockResponse();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Credenciales invalidas.',
    });
  });

  it('should return 401 when account is deactivated', async () => {
    const mockUser = {
      id: 1,
      nombre: 'Inactive User',
      email: 'inactive@test.com',
      passwordHash: '$2a$10$hashedpassword',
      rol: 'ABOGADO',
      activo: false,
      ultimoAcceso: null,
      fechaCreacion: new Date(),
    };

    // SELECT user query
    mockQuery.mockResolvedValueOnce([[mockUser], []]);

    const req = createMockRequest({
      email: 'inactive@test.com',
      password: 'password123',
    });
    const res = createMockResponse();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Cuenta desactivada. Contacte al administrador.',
    });
  });
});
