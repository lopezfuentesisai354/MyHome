// mobile/app/checkin/qr-scanner.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import checkInService from '@/services/checkin.service';

export default function QRScannerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const reservationId = params.reservationId as string;

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    // Solicitar permisos de cámara al montar
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;

    setScanned(true);
    setValidating(true);

    try {
      // Parsear datos del QR
      const qrData = JSON.parse(data);

      // Validar que el QR pertenece a esta reserva
      if (qrData.reservationId !== reservationId) {
        Alert.alert(
          'QR Inválido',
          'Este código QR no corresponde a tu reserva',
          [{ text: 'Escanear de nuevo', onPress: () => setScanned(false) }]
        );
        setValidating(false);
        return;
      }

      // Validar con el backend
      const validation = await checkInService.validateQR(data);

      if (!validation.success) {
        Alert.alert(
          'QR Inválido',
          validation.error || 'El código QR no es válido',
          [{ text: 'Escanear de nuevo', onPress: () => setScanned(false) }]
        );
        setValidating(false);
        return;
      }

      // QR válido, proceder con check-in
      Alert.alert(
        '¡Código QR Válido!',
        '¿Deseas realizar el check-in ahora?',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => {
              setScanned(false);
              setValidating(false);
            }
          },
          {
            text: 'Continuar',
            onPress: () => performCheckIn(data)
          }
        ]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        'No se pudo leer el código QR. Verifica que sea un código válido.',
        [{ text: 'Reintentar', onPress: () => setScanned(false) }]
      );
      setValidating(false);
    }
  };

  const performCheckIn = async (qrData: string) => {
    try {
      const result = await checkInService.performCheckIn(reservationId, qrData);

      if (!result.success) {
        Alert.alert('Error', result.error || 'No se pudo completar el check-in');
        setScanned(false);
        setValidating(false);
        return;
      }

      // Check-in exitoso, ir a captura de fotos
      Alert.alert(
        '¡Check-in Exitoso!',
        'Ahora debes tomar fotos del estado de la habitación',
        [
          {
            text: 'Continuar',
            onPress: () => {
              router.push({
                pathname: '/checkin/photo-capture',
                params: {
                  reservationId,
                  eventType: 'check-in'
                }
              });
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error al realizar el check-in');
      setScanned(false);
      setValidating(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0288D1" />
        <Text style={styles.loadingText}>Cargando cámara...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-outline" size={64} color="#999" />
        <Text style={styles.permissionText}>
          Necesitamos acceso a tu cámara para escanear el código QR
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Permitir Acceso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr']
        }}
      >
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerText}>Escanea el código QR</Text>
          </View>

          {/* Marco de escaneo */}
          <View style={styles.scanArea}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>
          </View>

          {/* Instrucciones */}
          <View style={styles.instructions}>
            <Text style={styles.instructionText}>
              Alinea el código QR dentro del marco
            </Text>
            {validating && (
              <View style={styles.validatingContainer}>
                <ActivityIndicator size="small" color="#FFF" />
                <Text style={styles.validatingText}>Validando código...</Text>
              </View>
            )}
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center'
  },
  camera: {
    flex: 1,
    width: '100%'
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20
  },
  backButton: {
    padding: 8
  },
  headerText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 16
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative'
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#00C853',
    borderWidth: 4
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0
  },
  instructions: {
    paddingBottom: 60,
    alignItems: 'center'
  },
  instructionText: {
    fontSize: 16,
    color: '#FFF',
    textAlign: 'center',
    paddingHorizontal: 40
  },
  validatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8
  },
  validatingText: {
    color: '#FFF',
    marginLeft: 8,
    fontSize: 14
  },
  loadingText: {
    color: '#FFF',
    marginTop: 16,
    fontSize: 16
  },
  permissionText: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 24,
    marginHorizontal: 40
  },
  permissionButton: {
    backgroundColor: '#0288D1',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 24
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  }
});
