import { describe, it, expect } from 'vitest';
import config from '../../config';

describe('Config module', () => {
  it('should have all required top-level keys', () => {
    expect(config).toHaveProperty('db');
    expect(config).toHaveProperty('jwt');
    expect(config).toHaveProperty('port');
    expect(config).toHaveProperty('corsOrigin');
    expect(config).toHaveProperty('nodeEnv');
  });

  describe('db config', () => {
    it('should have all required database properties', () => {
      expect(config.db).toHaveProperty('host');
      expect(config.db).toHaveProperty('port');
      expect(config.db).toHaveProperty('name');
      expect(config.db).toHaveProperty('user');
      expect(config.db).toHaveProperty('password');
    });

    it('should read from environment variables with defaults', () => {
      expect(typeof config.db.host).toBe('string');
      expect(typeof config.db.port).toBe('number');
      expect(typeof config.db.name).toBe('string');
      expect(typeof config.db.user).toBe('string');
      expect(typeof config.db.password).toBe('string');
    });
  });

  describe('jwt config', () => {
    it('should have secret and expiresIn', () => {
      expect(config.jwt).toHaveProperty('secret');
      expect(config.jwt).toHaveProperty('expiresIn');
    });

    it('secret should be a non-empty string', () => {
      expect(typeof config.jwt.secret).toBe('string');
      expect(config.jwt.secret.length).toBeGreaterThan(0);
    });

    it('expiresIn should be a non-empty string', () => {
      expect(typeof config.jwt.expiresIn).toBe('string');
      expect(config.jwt.expiresIn.length).toBeGreaterThan(0);
    });
  });

  describe('port', () => {
    it('should be a number', () => {
      expect(typeof config.port).toBe('number');
    });
  });

  describe('corsOrigin', () => {
    it('should be a string', () => {
      expect(typeof config.corsOrigin).toBe('string');
    });
  });

  describe('nodeEnv', () => {
    it('should be a string', () => {
      expect(typeof config.nodeEnv).toBe('string');
    });
  });
});
