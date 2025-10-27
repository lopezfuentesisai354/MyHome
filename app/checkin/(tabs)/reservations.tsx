// mobile/app/(tabs)/reservations.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import checkInService from '@/services/checkin.service';

interface Reservation {
  id: string;
  propertyName: string;
  propertyImage: string;
  checkInDate: string;
  checkOutDate: string;
  status: 'confirmed' | 'checked-in' | 'completed';
  hasCheckIn: boolean;
  hasCheckOut: boolean;
}

export default function ReservationsScreen() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    try {
      // TODO: Llamar al servicio real de reservas
      // const result = await reservationService.getMyReservations();
      
      // Datos mock para demostración
      const mockData: Reservation[] = [
        {
          id: '1',
          propertyName: 'Eco Lodge Sierra',
          propertyImage: 'https://via.placeholder.com/400x300',
          checkInDate: '2025-10-26T14:00:00',
          checkOutDate: '2025-10-28T11:00:00',
          status: 'confirmed',
          hasCheckIn: false,
          hasCheckOut: false
        },
        {
          id: '2',
          propertyName: 'Cabaña Montaña',
          propertyImage: 'https://via.placeholder.com/400x300',
          checkInDate: '2025-10-20T14:00:00',
          checkOutDate: '2025-10-22T11:00:00',
          status: 'checked-in',
          hasCheckIn: true,
          hasCheckOut: false
        }
      ];

      setReservations(mockData);
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error loading reservations:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReservations();
  };

  const handleCheckIn = (reservation: Reservation) => {
    router.push({
      pathname: '/checkin/qr-scanner',
      params: { reservationId: reservation.id }
    });
  };

  const handleCheckOut = (reservation: Reservation) => {
    router.push({
      pathname: '/checkin/photo-capture',
      params: {
        reservationId: reservation.id,
        eventType: 'check-out'
      }
    });
  };

  const canCheckIn = (reservation: Reservation) => {
    const now = new Date();
    const checkInDate = new Date(reservation.checkInDate);
    const hoursBefore = 24;
    
    return (
      !reservation.hasCheckIn &&
      reservation.status === 'confirmed' &&
      now >= new Date(checkInDate.getTime() - hoursBefore * 60 * 60 * 1000)
    );
  };

  const canCheckOut = (reservation: Reservation) => {
    const now = new Date();
    const checkOutDate = new Date(reservation.checkOutDate);
    
    return (
      reservation.hasCheckIn &&
      !reservation.hasCheckOut &&
      now <= checkOutDate
    );
  };

  const renderReservation = ({ item }: { item: Reservation }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.propertyImage }} style={styles.propertyImage} />
      
      <View style={styles.cardContent}>
        <Text style={styles.propertyName}>{item.propertyName}</Text>
        
        <View style={styles.datesContainer}>
          <View style={styles.dateRow}>
            <Ionicons name="log-in-outline" size={16} color="#666" />
            <Text style={styles.dateLabel}>Check-in:</Text>
            <Text style={styles.dateValue}>
              {new Date(item.checkInDate).toLocaleDateString('es-MX', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
          
          <View style={styles.dateRow}>
            <Ionicons name="log-out-outline" size={16} color="#666" />
            <Text style={styles.dateLabel}>Check-out:</Text>
            <Text style={styles.dateValue}>
              {new Date(item.checkOutDate).toLocaleDateString('es-MX', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
        </View>

        {/* Status badge */}
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusBadge,
            item.status === 'confirmed' && styles.statusConfirmed,
            item.status === 'checked-in' && styles.statusCheckedIn,
            item.status === 'completed' && styles.statusCompleted
          ]}>
            <Text style={styles.statusText}>
              {item.status === 'confirmed' && '⏳ Confirmada'}
              {item.status === 'checked-in' && '🏠 En estadía'}
              {item.status === 'completed' && '✅ Completada'}
            </Text>
          </View>
        </View>

        {/* Botones de acción */}
        <View style={styles.actionsContainer}>
          {canCheckIn(item) && (
            <TouchableOpacity
              style={styles.checkInButton}
              onPress={() => handleCheckIn(item)}
            >
              <Ionicons name="qr-code-outline" size={20} color="#FFF" />
              <Text style={styles.checkInButtonText}>Hacer Check-in</Text>
            </TouchableOpacity>
          )}

          {canCheckOut(item) && (
            <TouchableOpacity
              style={styles.checkOutButton}
              onPress={() => handleCheckOut(item)}
            >
              <Ionicons name="camera-outline" size={20} color="#FFF" />
              <Text style={styles.checkOutButtonText}>Hacer Check-out</Text>
            </TouchableOpacity>
          )}

          {item.hasCheckIn && !item.hasCheckOut && (
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={16} color="#0288D1" />
              <Text style={styles.infoText}>
                Recuerda hacer el check-out antes de las 11:00 AM
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0288D1" />
        <Text style={styles.loadingText}>Cargando reservas...</Text>
      </View>
    );
  }

  if (reservations.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="calendar-outline" size={64} color="#BDBDBD" />
        <Text style={styles.emptyText}>No tienes reservas</Text>
        <Text style={styles.emptySubtext}>
          Explora propiedades y haz tu primera reserva
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Reservas</Text>
      </View>

      <FlatList
        data={reservations}
        renderItem={renderReservation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  header: {
    backgroundColor: '#FFF',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333'
  },
  listContainer: {
    padding: 16
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  propertyImage: {
    width: '100%',
    height: 200
  },
  cardContent: {
    padding: 16
  },
  propertyName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12
  },
  datesContainer: {
    marginBottom: 12
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  dateLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    marginRight: 4
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  statusContainer: {
    marginBottom: 12
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  statusConfirmed: {
    backgroundColor: '#FFF9C4'
  },
  statusCheckedIn: {
    backgroundColor: '#C8E6C9'
  },
  statusCompleted: {
    backgroundColor: '#E0E0E0'
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600'
  },
  actionsContainer: {
    marginTop: 8
  },
  checkInButton: {
    flexDirection: 'row',
    backgroundColor: '#0288D1',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8
  },
  checkInButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  },
  checkOutButton: {
    flexDirection: 'row',
    backgroundColor: '#00C853',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8
  },
  checkOutButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    gap: 8
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#0288D1'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666'
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center'
  }
});
