import { describe, it, expect } from 'vitest';
import {
  generalLimiter,
  authLimiter,
  contactFormLimiter,
} from '../../../middleware/rateLimiter';

describe('Rate limiter middleware', () => {
  it('generalLimiter should exist and be a function', () => {
    expect(generalLimiter).toBeDefined();
    expect(typeof generalLimiter).toBe('function');
  });

  it('authLimiter should exist and be a function', () => {
    expect(authLimiter).toBeDefined();
    expect(typeof authLimiter).toBe('function');
  });

  it('contactFormLimiter should exist and be a function', () => {
    expect(contactFormLimiter).toBeDefined();
    expect(typeof contactFormLimiter).toBe('function');
  });
});
