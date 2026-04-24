import { describe, it, expect } from 'vitest';
import {
  loginValidation,
  createSolicitudValidation,
  updateSolicitudValidation,
  createUserValidation,
} from '../../../middleware/validation';

describe('Validation chains', () => {
  it('loginValidation should be an array', () => {
    expect(Array.isArray(loginValidation)).toBe(true);
    expect(loginValidation.length).toBeGreaterThan(0);
  });

  it('createSolicitudValidation should be an array', () => {
    expect(Array.isArray(createSolicitudValidation)).toBe(true);
    expect(createSolicitudValidation.length).toBeGreaterThan(0);
  });

  it('updateSolicitudValidation should be an array', () => {
    expect(Array.isArray(updateSolicitudValidation)).toBe(true);
    expect(updateSolicitudValidation.length).toBeGreaterThan(0);
  });

  it('createUserValidation should be an array', () => {
    expect(Array.isArray(createUserValidation)).toBe(true);
    expect(createUserValidation.length).toBeGreaterThan(0);
  });

  it('loginValidation should have validators for email and password', () => {
    // loginValidation has 2 validators: email and password
    expect(loginValidation.length).toBe(2);
  });

  it('createSolicitudValidation should have validators for all required fields', () => {
    // nombre, telefono, email, tipoCaso, mensaje, origen (optional)
    expect(createSolicitudValidation.length).toBe(6);
  });

  it('createUserValidation should have validators for all required fields', () => {
    // nombre, email, password, rol
    expect(createUserValidation.length).toBe(4);
  });
});
