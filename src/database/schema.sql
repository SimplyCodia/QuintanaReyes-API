-- ============================================================
-- Quintana Reyes & Asociados - Database Schema
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  passwordHash VARCHAR(255) NOT NULL,
  rol ENUM('ADMIN', 'ABOGADO') NOT NULL DEFAULT 'ABOGADO',
  activo TINYINT(1) NOT NULL DEFAULT 1,
  ultimoAcceso DATETIME NULL,
  fechaCreacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_users_email (email),
  INDEX idx_users_rol (rol),
  INDEX idx_users_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS solicitudes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  telefono VARCHAR(30) NOT NULL,
  email VARCHAR(255) NOT NULL,
  tipoCaso ENUM('FAMILIA','ADMINISTRATIVO','CORPORATIVO','CIVIL','PENAL','LABORAL','MIGRATORIO') NOT NULL,
  mensaje TEXT NOT NULL,
  estado ENUM('PENDIENTE','EN_PROCESO','ATENDIDA','ARCHIVADA') NOT NULL DEFAULT 'PENDIENTE',
  notasInternas TEXT NULL,
  asignadoAId INT NULL,
  origen VARCHAR(100) NULL DEFAULT 'web',
  fechaCreacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fechaActualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_solicitudes_estado (estado),
  INDEX idx_solicitudes_tipoCaso (tipoCaso),
  INDEX idx_solicitudes_email (email),
  INDEX idx_solicitudes_fechaCreacion (fechaCreacion),
  INDEX idx_solicitudes_asignadoAId (asignadoAId),

  CONSTRAINT fk_solicitudes_asignadoA
    FOREIGN KEY (asignadoAId) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS historial_estado (
  id INT AUTO_INCREMENT PRIMARY KEY,
  solicitudId INT NOT NULL,
  estadoAnterior ENUM('PENDIENTE','EN_PROCESO','ATENDIDA','ARCHIVADA') NULL,
  estadoNuevo ENUM('PENDIENTE','EN_PROCESO','ATENDIDA','ARCHIVADA') NOT NULL,
  usuarioId INT NOT NULL,
  comentario TEXT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_historial_solicitudId (solicitudId),
  INDEX idx_historial_usuarioId (usuarioId),
  INDEX idx_historial_fecha (fecha),

  CONSTRAINT fk_historial_solicitud
    FOREIGN KEY (solicitudId) REFERENCES solicitudes(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_historial_usuario
    FOREIGN KEY (usuarioId) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuarioId INT NULL,
  accion VARCHAR(100) NOT NULL,
  entidad VARCHAR(100) NOT NULL,
  entidadId INT NULL,
  metadata JSON NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_audit_usuarioId (usuarioId),
  INDEX idx_audit_entidad (entidad),
  INDEX idx_audit_fecha (fecha),

  CONSTRAINT fk_audit_usuario
    FOREIGN KEY (usuarioId) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS blog_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo_es VARCHAR(300) NOT NULL,
  titulo_en VARCHAR(300) NULL,
  slug_es VARCHAR(350) NOT NULL,
  slug_en VARCHAR(350) NULL,
  extracto_es TEXT NULL,
  extracto_en TEXT NULL,
  contenido_es LONGTEXT NOT NULL,
  contenido_en LONGTEXT NULL,
  categoria_es VARCHAR(100) NULL,
  categoria_en VARCHAR(100) NULL,
  tags_es JSON NULL,
  tags_en JSON NULL,
  imagenDestacada LONGTEXT NULL,
  imagenDestacadaMime VARCHAR(50) NULL,
  autor VARCHAR(200) NOT NULL,
  estado ENUM('BORRADOR', 'PROGRAMADO', 'PUBLICADO', 'ARCHIVADO') NOT NULL DEFAULT 'BORRADOR',
  fechaPublicacion DATETIME NULL,
  fechaCreacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fechaActualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  creadoPorId INT NULL,

  UNIQUE KEY idx_blog_slug_es (slug_es),
  UNIQUE KEY idx_blog_slug_en (slug_en),
  INDEX idx_blog_estado (estado),
  INDEX idx_blog_fechaPublicacion (fechaPublicacion),

  CONSTRAINT fk_blog_creadoPor
    FOREIGN KEY (creadoPorId) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- Initial admin user  (password: admin123)
-- ============================================================
INSERT INTO users (nombre, email, passwordHash, rol, activo)
VALUES (
  'Administrador',
  'admin@quintanareyes.com',
  '$2b$10$oZzaML6p9S4oiHQCCpqqfuGtT1nkjQFcwzOfLG7QECEtb2yi/NVNi',
  'ADMIN',
  1
)
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);
