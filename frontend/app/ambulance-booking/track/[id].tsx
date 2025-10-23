import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../services/api';

interface TrackingData {
  booking_id: string;
  booking_status: string;
  driver_name: string;
  driver_phone: string;
  vehicle_number: string;
  current_location: {
    latitude: number;
    longitude: number;
  };
  estimated_arrival_minutes: number;
  last_updated: string;
}

const STATUS_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  confirmed: { color: '#2196F3', icon: 'checkmark-circle', label: 'Confirmed' },
  en_route: { color: '#FF9800', icon: 'car', label: 'En Route' },
  arrived: { color: '#4CAF50', icon: 'location', label: 'Arrived' },
  completed: { color: '#9E9E9E', icon: 'checkmark-done', label: 'Completed' },
  cancelled: { color: '#F44336', icon: 'close-circle', label: 'Cancelled' },
};

export default function AmbulanceTrackingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTracking();
    const interval = setInterval(fetchTracking, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchTracking = async () => {
    try {
      const response = await api.get(`/ambulance/track/${id}`);
      setTracking(response.data);
    } catch (error) {
      console.error('Error fetching tracking:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phone: string) => {
    Alert.alert(
      'Call Driver',
      `Do you want to call ${phone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => Linking.openURL(`tel:${phone}`) },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F44336" />
          <Text style={styles.loadingText}>Loading tracking information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!tracking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#F44336" />
          <Text style={styles.errorText}>Unable to track ambulance</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusConfig = STATUS_CONFIG[tracking.booking_status] || STATUS_CONFIG.confirmed;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A237E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Ambulance</Text>
        <TouchableOpacity onPress={fetchTracking}>
          <Ionicons name="refresh" size={24} color="#1A237E" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.mapPlaceholder}>
          <Ionicons name="location" size={80} color="#F44336" />
          <Text style={styles.mapText}>Mock Map View</Text>
          <Text style={styles.coordinates}>
            Lat: {tracking.current_location.latitude.toFixed(4)}
          </Text>
          <Text style={styles.coordinates}>
            Lng: {tracking.current_location.longitude.toFixed(4)}
          </Text>
        </View>

        <View style={[styles.statusCard, { backgroundColor: statusConfig.color + '20' }]}>
          <Ionicons name={statusConfig.icon as any} size={32} color={statusConfig.color} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>

        <View style={styles.etaCard}>
          <Ionicons name="time" size={24} color="#2196F3" />
          <View style={styles.etaInfo}>
            <Text style={styles.etaLabel}>Estimated Arrival</Text>
            <Text style={styles.etaValue}>{tracking.estimated_arrival_minutes} minutes</Text>
          </View>
        </View>

        <View style={styles.driverCard}>
          <View style={styles.driverIcon}>
            <Ionicons name="person" size={32} color="#FFFFFF" />
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverLabel}>Driver</Text>
            <Text style={styles.driverName}>{tracking.driver_name}</Text>
            <Text style={styles.vehicleNumber}>{tracking.vehicle_number}</Text>
          </View>
          <TouchableOpacity
            style={styles.callButton}
            onPress={() => handleCall(tracking.driver_phone)}
          >
            <Ionicons name="call" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle" size={20} color="#757575" />
            <Text style={styles.infoText}>Last updated: {new Date(tracking.last_updated).toLocaleTimeString()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
            <Text style={styles.infoText}>Emergency services are on the way</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.helpButton}
          onPress={() => Linking.openURL('tel:112')}
        >
          <Ionicons name="call" size={20} color="#FFFFFF" />
          <Text style={styles.helpButtonText}>Call Emergency Hotline (112)</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  mapPlaceholder: {
    height: 250,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  mapText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 8,
  },
  coordinates: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  etaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  etaInfo: {
    flex: 1,
  },
  etaLabel: {
    fontSize: 14,
    color: '#546E7A',
  },
  etaValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  driverIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1A237E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverInfo: {
    flex: 1,
  },
  driverLabel: {
    fontSize: 12,
    color: '#757575',
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  vehicleNumber: {
    fontSize: 14,
    color: '#546E7A',
  },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#546E7A',
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F44336',
    paddingVertical: 16,
    borderRadius: 12,
  },
  helpButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#757575',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#757575',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#1A237E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});