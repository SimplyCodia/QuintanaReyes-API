import { describe, it, expect } from 'vitest';
import type { TipoCaso, EstadoSolicitud, UserRole } from '../../types';

describe('Type enums', () => {
  describe('TipoCaso', () => {
    it('should accept all 7 valid case types', () => {
      const validTypes: TipoCaso[] = [
        'FAMILIA',
        'ADMINISTRATIVO',
        'CORPORATIVO',
        'CIVIL',
        'PENAL',
        'LABORAL',
        'MIGRATORIO',
      ];

      expect(validTypes).toHaveLength(7);
      expect(validTypes).toContain('FAMILIA');
      expect(validTypes).toContain('ADMINISTRATIVO');
      expect(validTypes).toContain('CORPORATIVO');
      expect(validTypes).toContain('CIVIL');
      expect(validTypes).toContain('PENAL');
      expect(validTypes).toContain('LABORAL');
      expect(validTypes).toContain('MIGRATORIO');
    });

    it('each value is a non-empty string', () => {
      const validTypes: TipoCaso[] = [
        'FAMILIA',
        'ADMINISTRATIVO',
        'CORPORATIVO',
        'CIVIL',
        'PENAL',
        'LABORAL',
        'MIGRATORIO',
      ];

      for (const tipo of validTypes) {
        expect(typeof tipo).toBe('string');
        expect(tipo.length).toBeGreaterThan(0);
      }
    });
  });

  describe('EstadoSolicitud', () => {
    it('should accept all 4 valid states', () => {
      const validStates: EstadoSolicitud[] = [
        'PENDIENTE',
        'EN_PROCESO',
        'ATENDIDA',
        'ARCHIVADA',
      ];

      expect(validStates).toHaveLength(4);
      expect(validStates).toContain('PENDIENTE');
      expect(validStates).toContain('EN_PROCESO');
      expect(validStates).toContain('ATENDIDA');
      expect(validStates).toContain('ARCHIVADA');
    });
  });

  describe('UserRole', () => {
    it('should accept ADMIN and ABOGADO', () => {
      const validRoles: UserRole[] = ['ADMIN', 'ABOGADO'];

      expect(validRoles).toHaveLength(2);
      expect(validRoles).toContain('ADMIN');
      expect(validRoles).toContain('ABOGADO');
    });
  });
});
