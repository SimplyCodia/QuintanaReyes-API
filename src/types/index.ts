import { Request } from 'express';
import { RowDataPacket } from 'mysql2';

// ── User ──────────────────────────────────────────────────────────
export type UserRole = 'ADMIN' | 'ABOGADO';

export interface UserRow extends RowDataPacket {
  id: number;
  nombre: string;
  email: string;
  passwordHash: string;
  rol: UserRole;
  activo: boolean;
  ultimoAcceso: Date | null;
  fechaCreacion: Date;
}

export interface JwtPayload {
  id: number;
  email: string;
  rol: UserRole;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// ── Solicitud ─────────────────────────────────────────────────────
export type TipoCaso =
  | 'FAMILIA'
  | 'ADMINISTRATIVO'
  | 'CORPORATIVO'
  | 'CIVIL'
  | 'PENAL'
  | 'LABORAL'
  | 'MIGRATORIO';

export type EstadoSolicitud =
  | 'PENDIENTE'
  | 'EN_PROCESO'
  | 'ATENDIDA'
  | 'ARCHIVADA';

export interface SolicitudRow extends RowDataPacket {
  id: number;
  nombre: string;
  telefono: string;
  email: string;
  tipoCaso: TipoCaso;
  mensaje: string;
  estado: EstadoSolicitud;
  notasInternas: string | null;
  asignadoAId: number | null;
  origen: string | null;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

// ── Historial Estado ──────────────────────────────────────────────
export interface HistorialEstadoRow extends RowDataPacket {
  id: number;
  solicitudId: number;
  estadoAnterior: EstadoSolicitud | null;
  estadoNuevo: EstadoSolicitud;
  usuarioId: number;
  comentario: string | null;
  fecha: Date;
}

// ── Audit Log ─────────────────────────────────────────────────────
export interface AuditLogRow extends RowDataPacket {
  id: number;
  usuarioId: number | null;
  accion: string;
  entidad: string;
  entidadId: number | null;
  metadata: string | null;
  fecha: Date;
}

// ── API Response ──────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
