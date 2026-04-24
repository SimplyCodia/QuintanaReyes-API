import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../../../config';
import { authenticate, authorizeAdmin } from '../../../middleware/auth';
import { AuthRequest } from '../../../types';

// Mock jsonwebtoken
vi.mock('jsonwebtoken');

// Mock the database so it doesn't try to connect
vi.mock('../../../config/database', () => ({
  default: {
    query: vi.fn(),
    execute: vi.fn(),
  },
}));

function createMockRequest(overrides: Partial<Request> = {}): AuthRequest {
  return {
    headers: {},
    ...overrides,
  } as AuthRequest;
}

function createMockResponse(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe('authenticate middleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    next = vi.fn();
  });

  it('should reject requests without Authorization header with 401', () => {
    const req = createMockRequest({ headers: {} });
    const res = createMockResponse();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Token de autenticacion requerido.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject requests with Authorization header that does not start with Bearer', () => {
    const req = createMockRequest({
      headers: { authorization: 'Basic some-token' },
    });
    const res = createMockResponse();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Token de autenticacion requerido.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject requests with invalid token with 401', () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer invalid-token' },
    });
    const res = createMockResponse();

    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new Error('invalid token');
    });

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Token invalido o expirado.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should pass with a valid JWT token and attach user to request', () => {
    const payload = { id: 1, email: 'test@test.com', rol: 'ADMIN' as const };
    const req = createMockRequest({
      headers: { authorization: 'Bearer valid-token' },
    });
    const res = createMockResponse();

    vi.mocked(jwt.verify).mockReturnValue(payload as any);

    authenticate(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('valid-token', config.jwt.secret);
    expect(req.user).toEqual(payload);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('authorizeAdmin middleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    next = vi.fn();
  });

  it('should reject when req.user is not set with 401', () => {
    const req = createMockRequest();
    const res = createMockResponse();

    authorizeAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'No autenticado.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject non-admin users with 403', () => {
    const req = createMockRequest();
    req.user = { id: 1, email: 'abogado@test.com', rol: 'ABOGADO' };
    const res = createMockResponse();

    authorizeAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de administrador.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should pass for admin users', () => {
    const req = createMockRequest();
    req.user = { id: 1, email: 'admin@test.com', rol: 'ADMIN' };
    const res = createMockResponse();

    authorizeAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
