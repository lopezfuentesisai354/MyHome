// backend/src/services/photo.service.js
const { v4: uuidv4 } = require('uuid');
const { Photo } = require('../models/CheckIn');
const path = require('path');
const fs = require('fs').promises;

class PhotoService {
  constructor() {
    this.uploadDir = path.join(__dirname, '../../uploads/checkin-photos');
    this.maxFileSize = 5 * 1024 * 1024; // 5MB
    this.allowedTypes = ['image/jpeg', 'image/png'];
    this.minPhotos = 2;
    this.maxPhotos = 5;
  }

  /**
   * Inicializar directorio de uploads
   */
  async initUploadDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error);
    }
  }

  /**
   * Validar archivo de imagen
   */
  validateFile(file) {
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    if (file.size > this.maxFileSize) {
      return { 
        valid: false, 
        error: `File size exceeds ${this.maxFileSize / 1024 / 1024}MB limit` 
      };
    }

    if (!this.allowedTypes.includes(file.mimetype)) {
      return { 
        valid: false, 
        error: 'Only JPEG and PNG images are allowed' 
      };
    }

    return { valid: true };
  }

  /**
   * Guardar foto
   */
  async savePhoto(file, reservationId, eventType, userId) {
    try {
      // Validar archivo
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Generar nombre único
      const photoId = uuidv4();
      const extension = path.extname(file.originalname);
      const filename = `${reservationId}_${eventType}_${photoId}${extension}`;
      const storagePath = path.join(this.uploadDir, filename);

      // Guardar archivo físicamente
      await fs.writeFile(storagePath, file.buffer);

      // Guardar metadata en BD
      const photo = await Photo.create({
        id: photoId,
        reservationId,
        eventType,
        storagePath: `/uploads/checkin-photos/${filename}`,
        fileSize: file.size,
        metadata: {
          originalName: file.originalname,
          mimeType: file.mimetype,
          uploadedBy: userId,
          uploadedAt: new Date().toISOString()
        }
      });

      return {
        success: true,
        data: {
          photoId: photo.id,
          url: photo.storage_path,
          size: photo.file_size
        }
      };
    } catch (error) {
      console.error('Error saving photo:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Guardar múltiples fotos
   */
  async saveMultiplePhotos(files, reservationId, eventType, userId) {
    try {
      // Validar cantidad
      if (files.length < this.minPhotos) {
        return {
          success: false,
          error: `Minimum ${this.minPhotos} photos required`
        };
      }

      if (files.length > this.maxPhotos) {
        return {
          success: false,
          error: `Maximum ${this.maxPhotos} photos allowed`
        };
      }

      // Guardar todas las fotos
      const results = await Promise.all(
        files.map(file => this.savePhoto(file, reservationId, eventType, userId))
      );

      // Verificar si todas fueron exitosas
      const failed = results.filter(r => !r.success);
      if (failed.length > 0) {
        return {
          success: false,
          error: 'Some photos failed to upload',
          details: failed
        };
      }

      return {
        success: true,
        data: {
          count: results.length,
          photos: results.map(r => r.data)
        }
      };
    } catch (error) {
      console.error('Error saving multiple photos:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtener fotos de una reserva
   */
  async getPhotosByReservation(reservationId, eventType = null) {
    try {
      let photos;
      if (eventType) {
        photos = await Photo.findByReservationAndType(reservationId, eventType);
      } else {
        // Obtener todas las fotos (check-in y check-out)
        const checkInPhotos = await Photo.findByReservationAndType(reservationId, 'check-in');
        const checkOutPhotos = await Photo.findByReservationAndType(reservationId, 'check-out');
        
        return {
          success: true,
          data: {
            checkIn: checkInPhotos,
            checkOut: checkOutPhotos
          }
        };
      }

      return {
        success: true,
        data: photos
      };
    } catch (error) {
      console.error('Error getting photos:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validar cantidad de fotos antes de completar check-in/out
   */
  async validatePhotoCount(reservationId, eventType) {
    try {
      const count = await Photo.countByReservationAndType(reservationId, eventType);
      
      if (count < this.minPhotos) {
        return {
          valid: false,
          error: `Minimum ${this.minPhotos} photos required for ${eventType}`,
          current: count,
          required: this.minPhotos
        };
      }

      return {
        valid: true,
        count
      };
    } catch (error) {
      console.error('Error validating photo count:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }
}

module.exports = new PhotoService();
