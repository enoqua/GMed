import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

interface Ambulance {
  id: string;
  service_name: string;
  location: string;
  vehicle_type: string;
  service_areas: string[];
  availability_status: string;
  phone: string;
  email: string;
}

export default function AmbulancesScreen() {
  const router = useRouter();
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAmbulances();
  }, []);

  const fetchAmbulances = async () => {
    try {
      const response = await api.get('/ambulances/all');
      setAmbulances(response.data);
    } catch (error) {
      console.error('Error fetching ambulances:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAmbulances();
  };

  const handleCall = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('Error', 'Phone number not available');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return '#4CAF50';
      case 'busy':
        return '#FF9800';
      case 'offline':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  const filteredAmbulances = ambulances.filter((ambulance) =>
    ambulance.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ambulance.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderAmbulance = ({ item }: { item: Ambulance }) => (
    <View style={styles.ambulanceCard}>
      <View style={styles.ambulanceHeader}>
        <View style={styles.ambulanceIcon}>
          <Ionicons name="car" size={32} color="#F44336" />
        </View>
        <View style={styles.ambulanceInfo}>
          <Text style={styles.ambulanceName}>{item.service_name}</Text>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={14} color="#757575" />
            <Text style={styles.infoText}>{item.location}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="car-sport" size={14} color="#757575" />
            <Text style={styles.infoText}>{item.vehicle_type}</Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.availability_status) + '20' },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(item.availability_status) },
            ]}
          >
            {item.availability_status}
          </Text>
        </View>
      </View>

      {item.service_areas.length > 0 && (
        <View style={styles.serviceAreas}>
          <Text style={styles.serviceAreasLabel}>Service Areas:</Text>
          <Text style={styles.serviceAreasText}>
            {item.service_areas.join(', ')}
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.callButton]}
          onPress={() => handleCall(item.phone)}
        >
          <Ionicons name="call" size={20} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Call Emergency</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.bookButton]}
          onPress={() => router.push({ pathname: '/ambulance-booking', params: { ambulance_id: item.id, service_name: item.service_name } } as any)}
        >
          <Ionicons name="calendar" size={20} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Book</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A237E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ambulance Services</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.emergencyBanner}>
        <Ionicons name="warning" size={24} color="#F44336" />
        <Text style={styles.emergencyText}>
          For life-threatening emergencies, call 112 or 193 immediately
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#757575" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search ambulance services..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#BDBDBD"
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F44336" />
        </View>
      ) : filteredAmbulances.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="car" size={64} color="#BDBDBD" />
          <Text style={styles.emptyText}>No ambulance services found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAmbulances}
          keyExtractor={(item) => item.id}
          renderItem={renderAmbulance}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
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
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  emergencyText: {
    flex: 1,
    fontSize: 12,
    color: '#D32F2F',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#263238',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  ambulanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ambulanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ambulanceIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  ambulanceInfo: {
    flex: 1,
  },
  ambulanceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#757575',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  serviceAreas: {
    marginBottom: 12,
  },
  serviceAreasLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#546E7A',
    marginBottom: 4,
  },
  serviceAreasText: {
    fontSize: 12,
    color: '#757575',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
  },
  callButton: {
    backgroundColor: '#F44336',
  },
  bookButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 16,
  },
});