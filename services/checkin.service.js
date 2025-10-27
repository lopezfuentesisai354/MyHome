// mobile/src/services/checkin.service.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

class CheckInService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_URL}/checkin`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Interceptor para agregar token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  /**
   * Validar código QR
   */
  async validateQR(qrData) {
    try {
      const response = await this.api.post('/validate-qr', { qrData });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to validate QR code'
      };
    }
  }

  /**
   * Realizar check-in
   */
  async performCheckIn(reservationId, qrData) {
    try {
      const response = await this.api.post('/', {
        reservationId,
        qrData
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to complete check-in'
      };
    }
  }

  /**
   * Subir fotos
   */
  async uploadPhotos(reservationId, eventType, photos) {
    try {
      const formData = new FormData();
      formData.append('reservationId', reservationId);
      formData.append('eventType', eventType);

      // Agregar cada foto al FormData
      photos.forEach((photo, index) => {
        formData.append('photos', {
          uri: photo.uri,
          type: 'image/jpeg',
          name: `photo_${index}.jpg`
        });
      });

      const response = await this.api.post('/photos', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to upload photos'
      };
    }
  }

  /**
   * Obtener fotos de una reserva
   */
  async getPhotos(reservationId, eventType = null) {
    try {
      const params = eventType ? { eventType } : {};
      const response = await this.api.get(`/${reservationId}/photos`, { params });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to get photos'
      };
    }
  }

  /**
   * Realizar check-out
   */
  async performCheckOut(reservationId) {
    try {
      const response = await this.api.post('/checkout', { reservationId });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to complete check-out'
      };
    }
  }

  /**
   * Obtener estado de check-in/out
   */
  async getStatus(reservationId) {
    try {
      const response = await this.api.get(`/${reservationId}/status`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to get status'
      };
    }
  }

  /**
   * Guardar QR en caché local (modo offline)
   */
  async cacheQR(reservationId, qrData) {
    try {
      await AsyncStorage.setItem(
        `qr_${reservationId}`,
        JSON.stringify({
          qrData,
          cachedAt: new Date().toISOString()
        })
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener QR del caché
   */
  async getCachedQR(reservationId) {
    try {
      const cached = await AsyncStorage.getItem(`qr_${reservationId}`);
      if (cached) {
        return {
          success: true,
          data: JSON.parse(cached)
        };
      }
      return { success: false };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Guardar evento pendiente (modo offline)
   */
  async queuePendingEvent(eventData) {
    try {
      const queue = await AsyncStorage.getItem('pending_checkins');
      const events = queue ? JSON.parse(queue) : [];
      
      events.push({
        ...eventData,
        timestamp: new Date().toISOString()
      });

      await AsyncStorage.setItem('pending_checkins', JSON.stringify(events));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Sincronizar eventos pendientes
   */
  async syncPendingEvents() {
    try {
      const queue = await AsyncStorage.getItem('pending_checkins');
      if (!queue) return { success: true, synced: 0 };

      const events = JSON.parse(queue);
      const synced = [];
      const failed = [];

      for (const event of events) {
        try {
          if (event.type === 'check-in') {
            await this.performCheckIn(event.reservationId, event.qrData);
          } else if (event.type === 'check-out') {
            await this.performCheckOut(event.reservationId);
          }
          synced.push(event);
        } catch (error) {
          failed.push(event);
        }
      }

      // Actualizar cola con eventos fallidos
      await AsyncStorage.setItem('pending_checkins', JSON.stringify(failed));

      return {
        success: true,
        synced: synced.length,
        failed: failed.length
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new CheckInService();
