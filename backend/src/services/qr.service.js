// backend/src/services/qr.service.js
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const QRToken = require('../models/QRToken');

class QRService {
  /**
   * Generar QR para check-in
   */
  static async generateCheckInQR(reservationId, userId) {
    try {
      const tokenId = uuidv4();
      const issuedAt = new Date();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48); // Válido 48 horas

      // Crear payload del QR
      const qrPayload = {
        id: tokenId,
        reservationId,
        userId,
        type: 'check-in',
        issuedAt: issuedAt.toISOString(),
        expiresAt: expiresAt.toISOString()
      };

      // Generar hash seguro
      const tokenHash = QRToken.generateTokenHash(qrPayload);

      // Guardar en BD
      await QRToken.create({
        id: tokenId,
        reservationId,
        tokenHash,
        type: 'check-in',
        issuedAt,
        expiresAt
      });

      // Generar imagen QR
      const qrData = JSON.stringify({ ...qrPayload, hash: tokenHash });
      const qrImage = await QRCode.toDataURL(qrData);

      return {
        success: true,
        data: {
          tokenId,
          qrImage,
          qrData,
          expiresAt
        }
      };
    } catch (error) {
      console.error('Error generating check-in QR:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generar QR para check-out
   */
  static async generateCheckOutQR(reservationId, userId, checkinEventId) {
    try {
      const tokenId = uuidv4();
      const issuedAt = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1); // Válido 24 horas

      const qrPayload = {
        id: tokenId,
        reservationId,
        userId,
        checkinEventId,
        type: 'check-out',
        issuedAt: issuedAt.toISOString(),
        expiresAt: expiresAt.toISOString()
      };

      const tokenHash = QRToken.generateTokenHash(qrPayload);

      await QRToken.create({
        id: tokenId,
        reservationId,
        tokenHash,
        type: 'check-out',
        issuedAt,
        expiresAt
      });

      const qrData = JSON.stringify({ ...qrPayload, hash: tokenHash });
      const qrImage = await QRCode.toDataURL(qrData);

      return {
        success: true,
        data: {
          tokenId,
          qrImage,
          qrData,
          expiresAt
        }
      };
    } catch (error) {
      console.error('Error generating check-out QR:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validar QR escaneado
   */
  static async validateQR(scannedData) {
    try {
      // Parse del QR escaneado
      const qrPayload = typeof scannedData === 'string' 
        ? JSON.parse(scannedData) 
        : scannedData;

      const { hash, type, reservationId, userId } = qrPayload;

      if (!hash || !type || !reservationId) {
        return {
          valid: false,
          error: 'Invalid QR format'
        };
      }

      // Validar token en BD
      const validation = await QRToken.isValid(hash);

      if (!validation.valid) {
        return {
          valid: false,
          error: validation.reason
        };
      }

      // Verificar que el hash coincide
      const recalculatedHash = QRToken.generateTokenHash({
        id: qrPayload.id,
        reservationId: qrPayload.reservationId,
        userId: qrPayload.userId,
        type: qrPayload.type,
        issuedAt: qrPayload.issuedAt,
        expiresAt: qrPayload.expiresAt
      });

      if (recalculatedHash !== hash) {
        return {
          valid: false,
          error: 'QR signature invalid'
        };
      }

      return {
        valid: true,
        data: {
          tokenId: validation.token.id,
          reservationId: validation.token.reservation_id,
          type: validation.token.type,
          userId
        }
      };
    } catch (error) {
      console.error('Error validating QR:', error);
      return {
        valid: false,
        error: 'QR validation failed'
      };
    }
  }
}

module.exports = QRService;
