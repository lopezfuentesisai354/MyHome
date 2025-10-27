// backend/src/models/CheckIn.js
const db = require('../config/database'); // Asumiendo que tienen configurado pg

class CheckIn {
  /**
   * Crear un nuevo evento de check-in
   */
  static async create(data) {
    const query = `
      INSERT INTO checkin_events (
        id, reservation_id, user_id, qr_token_id, 
        checked_in_at, payment_captured, payment_id, door_opened
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      data.id,
      data.reservationId,
      data.userId,
      data.qrTokenId,
      data.checkedInAt || new Date(),
      data.paymentCaptured || false,
      data.paymentId || null,
      data.doorOpened || false
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Obtener check-in por ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM checkin_events WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Obtener check-in por reservation_id
   */
  static async findByReservationId(reservationId) {
    const query = `
      SELECT * FROM checkin_events 
      WHERE reservation_id = $1 
      ORDER BY checked_in_at DESC 
      LIMIT 1
    `;
    const result = await db.query(query, [reservationId]);
    return result.rows[0];
  }

  /**
   * Verificar si existe check-in para una reserva
   */
  static async existsForReservation(reservationId) {
    const query = 'SELECT COUNT(*) FROM checkin_events WHERE reservation_id = $1';
    const result = await db.query(query, [reservationId]);
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Actualizar estado de pago
   */
  static async updatePaymentStatus(id, paymentCaptured, paymentId) {
    const query = `
      UPDATE checkin_events 
      SET payment_captured = $1, payment_id = $2 
      WHERE id = $3 
      RETURNING *
    `;
    const result = await db.query(query, [paymentCaptured, paymentId, id]);
    return result.rows[0];
  }
}

class CheckOut {
  /**
   * Crear evento de check-out
   */
  static async create(data) {
    const query = `
      INSERT INTO checkout_events (
        id, reservation_id, user_id, checkin_event_id, checked_out_at
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      data.id,
      data.reservationId,
      data.userId,
      data.checkinEventId,
      data.checkedOutAt || new Date()
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Obtener check-out por reservation_id
   */
  static async findByReservationId(reservationId) {
    const query = `
      SELECT * FROM checkout_events 
      WHERE reservation_id = $1 
      ORDER BY checked_out_at DESC 
      LIMIT 1
    `;
    const result = await db.query(query, [reservationId]);
    return result.rows[0];
  }

  /**
   * Verificar si existe check-out para una reserva
   */
  static async existsForReservation(reservationId) {
    const query = 'SELECT COUNT(*) FROM checkout_events WHERE reservation_id = $1';
    const result = await db.query(query, [reservationId]);
    return parseInt(result.rows[0].count) > 0;
  }
}

class Photo {
  /**
   * Crear registro de foto
   */
  static async create(data) {
    const query = `
      INSERT INTO photos (
        id, reservation_id, event_type, storage_path, 
        file_size, metadata, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90); // 90 días de retención
    
    const values = [
      data.id,
      data.reservationId,
      data.eventType,
      data.storagePath,
      data.fileSize || 0,
      JSON.stringify(data.metadata || {}),
      data.expiresAt || expiresAt
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Obtener fotos por reserva y tipo de evento
   */
  static async findByReservationAndType(reservationId, eventType) {
    const query = `
      SELECT * FROM photos 
      WHERE reservation_id = $1 AND event_type = $2 
      ORDER BY uploaded_at DESC
    `;
    const result = await db.query(query, [reservationId, eventType]);
    return result.rows;
  }

  /**
   * Contar fotos por reserva y tipo
   */
  static async countByReservationAndType(reservationId, eventType) {
    const query = `
      SELECT COUNT(*) FROM photos 
      WHERE reservation_id = $1 AND event_type = $2
    `;
    const result = await db.query(query, [reservationId, eventType]);
    return parseInt(result.rows[0].count);
  }
}

module.exports = { CheckIn, CheckOut, Photo };
