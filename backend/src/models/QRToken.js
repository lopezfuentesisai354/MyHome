// backend/src/models/QRToken.js
const db = require('../config/database');
const crypto = require('crypto');

class QRToken {
  /**
   * Crear un nuevo token QR
   */
  static async create(data) {
    const query = `
      INSERT INTO qr_tokens (
        id, reservation_id, token_hash, type, 
        issued_at, expires_at, is_used
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      data.id,
      data.reservationId,
      data.tokenHash,
      data.type,
      data.issuedAt || new Date(),
      data.expiresAt,
      false
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Buscar token por hash
   */
  static async findByHash(tokenHash) {
    const query = `
      SELECT * FROM qr_tokens 
      WHERE token_hash = $1 
      ORDER BY issued_at DESC 
      LIMIT 1
    `;
    const result = await db.query(query, [tokenHash]);
    return result.rows[0];
  }

  /**
   * Buscar token por reservation_id y tipo
   */
  static async findByReservationAndType(reservationId, type) {
    const query = `
      SELECT * FROM qr_tokens 
      WHERE reservation_id = $1 AND type = $2 AND is_used = false
      ORDER BY issued_at DESC 
      LIMIT 1
    `;
    const result = await db.query(query, [reservationId, type]);
    return result.rows[0];
  }

  /**
   * Marcar token como usado
   */
  static async markAsUsed(id) {
    const query = `
      UPDATE qr_tokens 
      SET is_used = true, used_at = NOW() 
      WHERE id = $1 
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Validar si un token es válido
   */
  static async isValid(tokenHash) {
    const token = await this.findByHash(tokenHash);
    
    if (!token) {
      return { valid: false, reason: 'Token not found' };
    }

    if (token.is_used) {
      return { valid: false, reason: 'Token already used' };
    }

    if (new Date(token.expires_at) < new Date()) {
      return { valid: false, reason: 'Token expired' };
    }

    return { valid: true, token };
  }

  /**
   * Generar hash seguro para el token
   */
  static generateTokenHash(data) {
    const content = JSON.stringify(data) + process.env.JWT_SECRET;
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}

module.exports = QRToken;
