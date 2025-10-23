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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

interface Pharmacy {
  id: string;
  pharmacy_name: string;
  location: string;
  license_number: string;
  inventory_count: number;
  phone: string;
  email: string;
}

export default function PharmaciesScreen() {
  const router = useRouter();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPharmacies();
  }, []);

  const fetchPharmacies = async () => {
    try {
      const response = await api.get('/pharmacies/all');
      setPharmacies(response.data);
    } catch (error) {
      console.error('Error fetching pharmacies:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPharmacies();
  };

  const filteredPharmacies = pharmacies.filter((pharmacy) =>
    pharmacy.pharmacy_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pharmacy.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderPharmacy = ({ item }: { item: Pharmacy }) => (
    <TouchableOpacity
      style={styles.pharmacyCard}
      onPress={() => router.push(`/pharmacies/${item.id}` as any)}
    >
      <View style={styles.pharmacyIcon}>
        <Ionicons name="flask" size={32} color="#FF9800" />
      </View>
      <View style={styles.pharmacyInfo}>
        <Text style={styles.pharmacyName}>{item.pharmacy_name}</Text>
        <View style={styles.infoRow}>
          <Ionicons name="location" size={14} color="#757575" />
          <Text style={styles.infoText}>{item.location}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="medkit" size={14} color="#757575" />
          <Text style={styles.infoText}>{item.inventory_count} medicines</Text>
        </View>
        {item.phone && (
          <View style={styles.infoRow}>
            <Ionicons name="call" size={14} color="#757575" />
            <Text style={styles.infoText}>{item.phone}</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={24} color="#BDBDBD" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A237E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pharmacy Shops</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#757575" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search pharmacies or locations..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#BDBDBD"
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF9800" />
        </View>
      ) : filteredPharmacies.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="flask" size={64} color="#BDBDBD" />
          <Text style={styles.emptyText}>No pharmacies found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPharmacies}
          keyExtractor={(item) => item.id}
          renderItem={renderPharmacy}
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
  pharmacyCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pharmacyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  pharmacyInfo: {
    flex: 1,
  },
  pharmacyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 8,
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