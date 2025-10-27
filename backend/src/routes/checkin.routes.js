// backend/src/routes/checkin.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const checkInController = require('../controllers/checkin.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Configurar multer para subida de imágenes
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 5 // Máximo 5 archivos
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG images are allowed'), false);
    }
  }
});

/**
 * @route   POST /api/checkin/validate-qr
 * @desc    Validar código QR
 * @access  Private (requiere autenticación)
 */
router.post(
  '/validate-qr',
  authMiddleware.protect,
  checkInController.validateQR
);

/**
 * @route   POST /api/checkin
 * @desc    Realizar check-in
 * @access  Private
 */
router.post(
  '/',
  authMiddleware.protect,
  checkInController.performCheckIn
);

/**
 * @route   POST /api/checkin/photos
 * @desc    Subir fotos del estado de la habitación
 * @access  Private
 */
router.post(
  '/photos',
  authMiddleware.protect,
  upload.array('photos', 5), // Hasta 5 fotos
  checkInController.uploadPhotos
);

/**
 * @route   GET /api/checkin/:reservationId/photos
 * @desc    Obtener fotos de una reserva
 * @access  Private
 */
router.get(
  '/:reservationId/photos',
  authMiddleware.protect,
  checkInController.getPhotos
);

/**
 * @route   POST /api/checkout
 * @desc    Realizar check-out
 * @access  Private
 */
router.post(
  '/checkout',
  authMiddleware.protect,
  checkInController.performCheckOut
);

/**
 * @route   GET /api/checkin/:reservationId/status
 * @desc    Obtener estado del check-in/out
 * @access  Private
 */
router.get(
  '/:reservationId/status',
  authMiddleware.protect,
  checkInController.getStatus
);

module.exports = router;
