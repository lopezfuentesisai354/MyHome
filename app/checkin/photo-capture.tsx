// mobile/app/checkin/photo-capture.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import checkInService from '@/services/checkin.service';

interface Photo {
  uri: string;
  width: number;
  height: number;
}

export default function PhotoCaptureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const reservationId = params.reservationId as string;
  const eventType = params.eventType as 'check-in' | 'check-out';

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);

  const MIN_PHOTOS = 2;
  const MAX_PHOTOS = 5;

  const handleTakePhoto = async () => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert(
        'Límite alcanzado',
        `Solo puedes tomar hasta ${MAX_PHOTOS} fotos`
      );
      return;
    }

    // Solicitar permisos
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permiso Denegado',
        'Necesitamos acceso a tu cámara para tomar fotos'
      );
      return;
    }

    // Abrir cámara
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8
    });

    if (!result.canceled && result.assets[0]) {
      setPhotos([...photos, result.assets[0]]);
    }
  };

  const handlePickFromGallery = async () => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert(
        'Límite alcanzado',
        `Solo puedes seleccionar hasta ${MAX_PHOTOS} fotos`
      );
      return;
    }

    // Solicitar permisos
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permiso Denegado',
        'Necesitamos acceso a tu galería para seleccionar fotos'
      );
      return;
    }

    // Abrir galería
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length
    });

    if (!result.canceled) {
      setPhotos([...photos, ...result.assets]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    Alert.alert(
      'Eliminar foto',
      '¿Estás seguro de eliminar esta foto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            const newPhotos = [...photos];
            newPhotos.splice(index, 1);
            setPhotos(newPhotos);
          }
        }
      ]
    );
  };

  const handleUploadPhotos = async () => {
    if (photos.length < MIN_PHOTOS) {
      Alert.alert(
        'Fotos insuficientes',
        `Debes tomar al menos ${MIN_PHOTOS} fotos`
      );
      return;
    }

    setUploading(true);

    try {
      const result = await checkInService.uploadPhotos(
        reservationId,
        eventType,
        photos
      );

      if (!result.success) {
        Alert.alert('Error', result.error || 'No se pudieron subir las fotos');
        setUploading(false);
        return;
      }

      // Fotos subidas exitosamente
      Alert.alert(
        '¡Listo!',
        eventType === 'check-in'
          ? 'Check-in completado exitosamente'
          : 'Check-out completado exitosamente',
        [
          {
            text: 'Continuar',
            onPress: () => {
              // Regresar a mis reservas
              router.replace('/reservations');
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error al subir las fotos');
      setUploading(false);
    }
  };

  const isValid = photos.length >= MIN_PHOTOS && photos.length <= MAX_PHOTOS;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {eventType === 'check-in' 
            ? 'Estado Inicial de la Habitación'
            : 'Estado Final de la Habitación'}
        </Text>
      </View>

      {/* Instrucciones */}
      <View style={styles.instructionsCard}>
        <Ionicons name="information-circle" size={24} color="#0288D1" />
        <Text style={styles.instructionsText}>
          Toma fotos claras de la habitación, baño y áreas principales.
          Mínimo {MIN_PHOTOS} fotos, máximo {MAX_PHOTOS}.
        </Text>
      </View>

      {/* Contador de fotos */}
      <View style={styles.counter}>
        <Text style={[styles.counterText, isValid && styles.counterValid]}>
          {photos.length}/{MAX_PHOTOS} fotos
        </Text>
        {photos.length < MIN_PHOTOS && (
          <Text style={styles.counterHint}>
            Faltan {MIN_PHOTOS - photos.length} fotos
          </Text>
        )}
      </View>

      {/* Grid de fotos */}
      <ScrollView style={styles.photosContainer}>
        <View style={styles.photosGrid}>
          {photos.map((photo, index) => (
            <View key={index} style={styles.photoCard}>
              <Image source={{ uri: photo.uri }} style={styles.photo} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemovePhoto(index)}
              >
                <Ionicons name="close-circle" size={32} color="#FF5252" />
              </TouchableOpacity>
            </View>
          ))}

          {/* Botón para agregar foto */}
          {photos.length < MAX_PHOTOS && (
            <TouchableOpacity
              style={styles.addPhotoCard}
              onPress={handleTakePhoto}
            >
              <Ionicons name="camera" size={48} color="#0288D1" />
              <Text style={styles.addPhotoText}>Tomar foto</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Botones de acción */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.galleryButton}
          onPress={handlePickFromGallery}
        >
          <Ionicons name="images-outline" size={24} color="#0288D1" />
          <Text style={styles.galleryButtonText}>Galería</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.continueButton,
            (!isValid || uploading) && styles.continueButtonDisabled
          ]}
          onPress={handleUploadPhotos}
          disabled={!isValid || uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.continueButtonText}>
                {eventType === 'check-in' 
                  ? 'Completar Check-in'
                  : 'Completar Check-out'}
              </Text>
              <Ionicons name="checkmark-circle" size={24} color="#FFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 16,
    flex: 1
  },
  instructionsCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  instructionsText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#0288D1',
    lineHeight: 20
  },
  counter: {
    alignItems: 'center',
    marginBottom: 16
  },
  counterText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#999'
  },
  counterValid: {
    color: '#00C853'
  },
  counterHint: {
    fontSize: 12,
    color: '#FF5252',
    marginTop: 4
  },
  photosContainer: {
    flex: 1
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 100
  },
  photoCard: {
    width: '48%',
    aspectRatio: 1,
    margin: '1%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  photo: {
    width: '100%',
    height: '100%'
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8
  },
  addPhotoCard: {
    width: '48%',
    aspectRatio: 1,
    margin: '1%',
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#0288D1',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center'
  },
  addPhotoText: {
    marginTop: 8,
    fontSize: 14,
    color: '#0288D1',
    fontWeight: '600'
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    flexDirection: 'row',
    gap: 12
  },
  galleryButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8
  },
  galleryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0288D1'
  },
  continueButton: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: '#00C853',
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8
  },
  continueButtonDisabled: {
    backgroundColor: '#BDBDBD'
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF'
  }
});
