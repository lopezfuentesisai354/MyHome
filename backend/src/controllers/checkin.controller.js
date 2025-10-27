// backend/src/controllers/checkin.controller.js
const { v4: uuidv4 } = require('uuid');
const { CheckIn, CheckOut } = require('../models/CheckIn');
const QRService = require('../services/qr.service');
const photoService = require('../services/photo.service');

class CheckInController {
  /**
   * POST /api/checkin/validate-qr
   * Validar código QR escaneado
   */
  async validateQR(req, res) {
    try {
      const { qrData } = req.body;

      if (!qrData) {
        return res.status(400).json({
          success: false,
          error: 'QR data is required'
        });
      }

      const validation = await QRService.validateQR(qrData);

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: validation.error
        });
      }

      return res.status(200).json({
        success: true,
        message: 'QR is valid',
        data: validation.data
      });
    } catch (error) {
      console.error('Error validating QR:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * POST /api/checkin
   * Realizar check-in
   */
  async performCheckIn(req, res) {
    try {
      const { reservationId, qrData } = req.body;
      const userId = req.user.id; // Desde middleware de autenticación

      // 1. Validar QR
      const qrValidation = await QRService.validateQR(qrData);
      if (!qrValidation.valid) {
        return res.status(400).json({
          success: false,
          error: qrValidation.error
        });
      }

      // 2. Verificar que no exista check-in previo
      const existingCheckIn = await CheckIn.findByReservationId(reservationId);
      if (existingCheckIn) {
        return res.status(400).json({
          success: false,
          error: 'Check-in already completed for this reservation'
        });
      }

      // 3. Crear evento de check-in
      const checkInId = uuidv4();
      const checkInEvent = await CheckIn.create({
        id: checkInId,
        reservationId,
        userId,
        qrTokenId: qrValidation.data.tokenId,
        checkedInAt: new Date(),
        paymentCaptured: false, // Se actualizará después
        doorOpened: false // Se actualizará después
      });

      // 4. Marcar QR como usado
      const QRToken = require('../models/QRToken');
      await QRToken.markAsUsed(qrValidation.data.tokenId);

      // 5. TODO: Disparar cobro automático (integración con Stripe)
      // const paymentResult = await paymentService.capturePayment(reservationId);
      // await CheckIn.updatePaymentStatus(checkInId, true, paymentResult.id);

      // 6. TODO: Disparar apertura de puerta (IoT Gateway)
      // await iotService.openDoor(reservationId);

      // 7. TODO: Enviar notificación push
      // await notificationService.sendCheckInConfirmation(userId, reservationId);

      return res.status(201).json({
        success: true,
        message: 'Check-in completed successfully',
        data: {
          checkInId: checkInEvent.id,
          reservationId: checkInEvent.reservation_id,
          checkedInAt: checkInEvent.checked_in_at,
          nextStep: 'Upload photos of the room'
        }
      });
    } catch (error) {
      console.error('Error performing check-in:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to complete check-in'
      });
    }
  }

  /**
   * POST /api/checkin/photos
   * Subir fotos del estado de la habitación
   */
  async uploadPhotos(req, res) {
    try {
      const { reservationId, eventType } = req.body;
      const userId = req.user.id;
      const files = req.files; // Desde multer middleware

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No photos provided'
        });
      }

      if (!['check-in', 'check-out'].includes(eventType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid event type'
        });
      }

      // Guardar fotos
      const result = await photoService.saveMultiplePhotos(
        files,
        reservationId,
        eventType,
        userId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(201).json({
        success: true,
        message: 'Photos uploaded successfully',
        data: result.data
      });
    } catch (error) {
      console.error('Error uploading photos:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload photos'
      });
    }
  }

  /**
   * GET /api/checkin/:reservationId/photos
   * Obtener fotos de una reserva
   */
  async getPhotos(req, res) {
    try {
      const { reservationId } = req.params;
      const { eventType } = req.query;

      const result = await photoService.getPhotosByReservation(
        reservationId,
        eventType
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error('Error getting photos:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve photos'
      });
    }
  }

  /**
   * POST /api/checkout
   * Realizar check-out
   */
  async performCheckOut(req, res) {
    try {
      const { reservationId } = req.body;
      const userId = req.user.id;

      // 1. Verificar que existe check-in
      const checkInEvent = await CheckIn.findByReservationId(reservationId);
      if (!checkInEvent) {
        return res.status(400).json({
          success: false,
          error: 'No check-in found for this reservation'
        });
      }

      // 2. Verificar que no exista check-out previo
      const existingCheckOut = await CheckOut.findByReservationId(reservationId);
      if (existingCheckOut) {
        return res.status(400).json({
          success: false,
          error: 'Check-out already completed'
        });
      }

      // 3. Validar que se hayan subido las fotos requeridas
      const photoValidation = await photoService.validatePhotoCount(
        reservationId,
        'check-out'
      );

      if (!photoValidation.valid) {
        return res.status(400).json({
          success: false,
          error: photoValidation.error,
          details: {
            current: photoValidation.current,
            required: photoValidation.required
          }
        });
      }

      // 4. Crear evento de check-out
      const checkOutId = uuidv4();
      const checkOutEvent = await CheckOut.create({
        id: checkOutId,
        reservationId,
        userId,
        checkinEventId: checkInEvent.id,
        checkedOutAt: new Date()
      });

      // 5. TODO: Actualizar estado de la reserva a "completed"
      // await Reservation.updateStatus(reservationId, 'completed');

      // 6. TODO: Notificar al propietario
      // await notificationService.sendCheckOutNotification(propertyOwnerId, reservationId);

      return res.status(201).json({
        success: true,
        message: 'Check-out completed successfully',
        data: {
          checkOutId: checkOutEvent.id,
          reservationId: checkOutEvent.reservation_id,
          checkedOutAt: checkOutEvent.checked_out_at
        }
      });
    } catch (error) {
      console.error('Error performing check-out:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to complete check-out'
      });
    }
  }

  /**
   * GET /api/checkin/:reservationId/status
   * Obtener estado del check-in/out
   */
  async getStatus(req, res) {
    try {
      const { reservationId } = req.params;

      const checkIn = await CheckIn.findByReservationId(reservationId);
      const checkOut = await CheckOut.findByReservationId(reservationId);

      const status = {
        hasCheckIn: !!checkIn,
        hasCheckOut: !!checkOut,
        checkInDate: checkIn?.checked_in_at || null,
        checkOutDate: checkOut?.checked_out_at || null
      };

      return res.status(200).json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Error getting status:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve status'
      });
    }
  }
}

module.exports = new CheckInController();
