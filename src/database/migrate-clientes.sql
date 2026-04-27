-- Migration: Add clienteId to solicitudes and create clientes table
-- Run this on existing databases that already have the solicitudes table

CREATE TABLE IF NOT EXISTS clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  telefono VARCHAR(30) NOT NULL,
  email VARCHAR(255) NOT NULL,
  notas TEXT NULL,
  fechaCreacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fechaActualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_clientes_email (email),
  INDEX idx_clientes_nombre (nombre),
  INDEX idx_clientes_telefono (telefono)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE solicitudes
  ADD COLUMN IF NOT EXISTS clienteId INT NULL AFTER asignadoAId,
  ADD INDEX idx_solicitudes_clienteId (clienteId);

-- Note: The FK constraint uses a name, so check if it exists to avoid duplicates
-- If running on MySQL 8+ this is safe to re-run
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_NAME = 'fk_solicitudes_cliente' AND TABLE_NAME = 'solicitudes');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE solicitudes ADD CONSTRAINT fk_solicitudes_cliente FOREIGN KEY (clienteId) REFERENCES clientes(id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
