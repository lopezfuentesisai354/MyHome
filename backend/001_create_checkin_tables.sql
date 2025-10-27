-- database/migrations/001_create_checkin_tables.sql
-- Migración para crear las tablas del módulo de Check-in/Check-out
-- Autor: Ricardo (Módulo Check-in)
-- Fecha: Octubre 2025

-- ============================================
-- Tabla: qr_tokens
-- Almacena los códigos QR generados para check-in y check-out
-- ============================================
CREATE TABLE IF NOT EXISTS qr_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('check-in', 'check-out')),
    issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys (descomentar cuando existan las tablas de reservations)
    -- CONSTRAINT fk_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
    
    -- Índices para mejorar performance
    CONSTRAINT idx_token_hash_unique UNIQUE (token_hash)
);

-- Índices
CREATE INDEX idx_qr_tokens_reservation ON qr_tokens(reservation_id);
CREATE INDEX idx_qr_tokens_type ON qr_tokens(type);
CREATE INDEX idx_qr_tokens_expires ON qr_tokens(expires_at);

-- ============================================
-- Tabla: checkin_events
-- Almacena los eventos de check-in
-- ============================================
CREATE TABLE IF NOT EXISTS checkin_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL,
    user_id UUID NOT NULL,
    qr_token_id UUID,
    checked_in_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payment_captured BOOLEAN DEFAULT FALSE,
    payment_id VARCHAR(255),
    door_opened BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys (descomentar cuando existan las tablas)
    -- CONSTRAINT fk_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
    -- CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_qr_token FOREIGN KEY (qr_token_id) REFERENCES qr_tokens(id) ON DELETE SET NULL,
    
    -- Restricción: solo un check-in por reserva
    CONSTRAINT unique_reservation_checkin UNIQUE (reservation_id)
);

-- Índices
CREATE INDEX idx_checkin_reservation ON checkin_events(reservation_id);
CREATE INDEX idx_checkin_user ON checkin_events(user_id);
CREATE INDEX idx_checkin_date ON checkin_events(checked_in_at);

-- ============================================
-- Tabla: checkout_events
-- Almacena los eventos de check-out
-- ============================================
CREATE TABLE IF NOT EXISTS checkout_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL,
    user_id UUID NOT NULL,
    checkin_event_id UUID,
    checked_out_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    -- CONSTRAINT fk_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
    -- CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_checkin_event FOREIGN KEY (checkin_event_id) REFERENCES checkin_events(id) ON DELETE SET NULL,
    
    -- Restricción: solo un check-out por reserva
    CONSTRAINT unique_reservation_checkout UNIQUE (reservation_id)
);

-- Índices
CREATE INDEX idx_checkout_reservation ON checkout_events(reservation_id);
CREATE INDEX idx_checkout_user ON checkout_events(user_id);
CREATE INDEX idx_checkout_date ON checkout_events(checked_out_at);

-- ============================================
-- Tabla: photos
-- Almacena las fotos tomadas durante check-in y check-out
-- ============================================
CREATE TABLE IF NOT EXISTS photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL,
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('check-in', 'check-out')),
    storage_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP, -- Para retención limitada (ej. 90 días)
    metadata JSONB, -- Información adicional (nombre original, tipo MIME, etc.)
    
    -- Foreign Keys
    -- CONSTRAINT fk_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_photos_reservation ON photos(reservation_id);
CREATE INDEX idx_photos_event_type ON photos(event_type);
CREATE INDEX idx_photos_expires ON photos(expires_at);

-- ============================================
-- Función: Limpiar QR tokens expirados automáticamente
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_qr_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM qr_tokens
    WHERE expires_at < CURRENT_TIMESTAMP
    AND is_used = FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Función: Limpiar fotos expiradas automáticamente
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_photos()
RETURNS void AS $$
BEGIN
    DELETE FROM photos
    WHERE expires_at IS NOT NULL
    AND expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Triggers para auditoría (opcional)
-- ============================================
-- Puedes agregar triggers para registrar cambios en una tabla de auditoría

-- ============================================
-- Datos iniciales de prueba (SOLO PARA DESARROLLO)
-- ============================================
-- Descomentar solo en ambiente de desarrollo

/*
-- QR Token de prueba
INSERT INTO qr_tokens (id, reservation_id, token_hash, type, expires_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'hash_de_prueba_123', 'check-in', CURRENT_TIMESTAMP + INTERVAL '48 hours');
*/

-- ============================================
-- Comentarios sobre las tablas
-- ============================================
COMMENT ON TABLE qr_tokens IS 'Almacena los códigos QR generados para check-in y check-out';
COMMENT ON TABLE checkin_events IS 'Registra los eventos de check-in realizados';
COMMENT ON TABLE checkout_events IS 'Registra los eventos de check-out realizados';
COMMENT ON TABLE photos IS 'Almacena las fotos del estado de las habitaciones';

COMMENT ON COLUMN qr_tokens.token_hash IS 'Hash SHA-256 del QR para validación de seguridad';
COMMENT ON COLUMN qr_tokens.is_used IS 'Indica si el QR ya fue utilizado (un solo uso)';
COMMENT ON COLUMN checkin_events.payment_captured IS 'Indica si el pago fue capturado exitosamente';
COMMENT ON COLUMN photos.expires_at IS 'Fecha de expiración para cumplir con políticas de retención';
COMMENT ON COLUMN photos.metadata IS 'JSON con información adicional (nombre original, MIME type, etc.)';

-- ============================================
-- Grants de permisos (ajustar según tu configuración)
-- ============================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON qr_tokens TO myhome_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON checkin_events TO myhome_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON checkout_events TO myhome_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON photos TO myhome_app_user;
