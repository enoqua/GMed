import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { Picker } from '@react-native-picker/picker';

interface Bed {
  id: string;
  room_number: string;
  bed_number: string;
  bed_type: string;
  department: string;
  status: string;
  patient_id?: string;
  price_per_day: number;
}

export default function BedsScreen() {
  const router = useRouter();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'available' | 'occupied'>('all');

  const [formData, setFormData] = useState({
    room_number: '',
    bed_number: '',
    bed_type: 'general',
    department: 'General Ward',
    price_per_day: '150',
  });

  useEffect(() => {
    fetchBeds();
  }, []);

  const fetchBeds = async () => {
    try {
      const response = await api.get('/hospital/beds');
      setBeds(response.data);
    } catch (error) {
      console.error('Error fetching beds:', error);
      Alert.alert('Error', 'Failed to load beds');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBeds();
  };

  const handleCreateBed = async () => {
    if (!formData.room_number || !formData.bed_number) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      setCreating(true);
      await api.post('/hospital/beds', {
        room_number: formData.room_number,
        bed_number: formData.bed_number,
        bed_type: formData.bed_type,
        department: formData.department,
        price_per_day: parseFloat(formData.price_per_day),
      });

      Alert.alert('Success', 'Bed created successfully');
      setModalVisible(false);
      setFormData({
        room_number: '',
        bed_number: '',
        bed_type: 'general',
        department: 'General Ward',
        price_per_day: '150',
      });
      fetchBeds();
    } catch (error: any) {
      console.error('Error creating bed:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create bed');
    } finally {
      setCreating(false);
    }
  };

  const filteredBeds = beds.filter(bed => {
    if (filter === 'all') return true;
    return bed.status === filter;
  });

  const stats = {
    total: beds.length,
    available: beds.filter(b => b.status === 'available').length,
    occupied: beds.filter(b => b.status === 'occupied').length,
    occupancyRate: beds.length > 0 ? (beds.filter(b => b.status === 'occupied').length / beds.length * 100).toFixed(1) : '0',
  };

  const getBedIcon = (type: string) => {
    switch (type) {
      case 'icu': return 'medical';
      case 'vip': return 'star';
      case 'maternity': return 'heart';
      default: return 'bed';
    }
  };

  const renderBed = ({ item }: { item: Bed }) => (
    <TouchableOpacity style={styles.bedCard}>
      <View style={styles.bedHeader}>
        <View style={[styles.bedIcon, { backgroundColor: item.status === 'available' ? '#E8F5E9' : '#FFEBEE' }]}>
          <Ionicons name={getBedIcon(item.bed_type)} size={24} color={item.status === 'available' ? '#4CAF50' : '#F44336'} />
        </View>
        <View style={styles.bedInfo}>
          <Text style={styles.bedName}>Room {item.room_number} - Bed {item.bed_number}</Text>
          <Text style={styles.bedType}>{item.bed_type.toUpperCase()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'available' ? '#4CAF50' : '#F44336' }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.bedDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="business" size={16} color="#757575" />
          <Text style={styles.detailText}>{item.department}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="cash" size={16} color="#757575" />
          <Text style={styles.detailText}>GH₵ {item.price_per_day}/day</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A237E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bed Management</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
          <Ionicons name="add-circle" size={28} color="#1976D2" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Beds</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#4CAF50' }]}>{stats.available}</Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#F44336' }]}>{stats.occupied}</Text>
          <Text style={styles.statLabel}>Occupied</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#FF9800' }]}>{stats.occupancyRate}%</Text>
          <Text style={styles.statLabel}>Occupancy</Text>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'available' && styles.filterButtonActive]}
          onPress={() => setFilter('available')}
        >
          <Text style={[styles.filterText, filter === 'available' && styles.filterTextActive]}>Available</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'occupied' && styles.filterButtonActive]}
          onPress={() => setFilter('occupied')}
        >
          <Text style={[styles.filterText, filter === 'occupied' && styles.filterTextActive]}>Occupied</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
        </View>
      ) : filteredBeds.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="bed-outline" size={64} color="#BDBDBD" />
          <Text style={styles.emptyText}>No beds found</Text>
          <TouchableOpacity style={styles.createButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.createButtonText}>Add First Bed</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredBeds}
          keyExtractor={(item) => item.id}
          renderItem={renderBed}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Bed</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#546E7A" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.inputLabel}>Room Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 101"
                value={formData.room_number}
                onChangeText={(text) => setFormData({ ...formData, room_number: text })}
              />

              <Text style={styles.inputLabel}>Bed Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., A or 1"
                value={formData.bed_number}
                onChangeText={(text) => setFormData({ ...formData, bed_number: text })}
              />

              <Text style={styles.inputLabel}>Bed Type *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.bed_type}
                  onValueChange={(value) => setFormData({ ...formData, bed_type: value })}
                >
                  <Picker.Item label="General" value="general" />
                  <Picker.Item label="ICU" value="icu" />
                  <Picker.Item label="VIP" value="vip" />
                  <Picker.Item label="Maternity" value="maternity" />
                </Picker>
              </View>

              <Text style={styles.inputLabel}>Department *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., General Ward"
                value={formData.department}
                onChangeText={(text) => setFormData({ ...formData, department: text })}
              />

              <Text style={styles.inputLabel}>Price Per Day (GH₵) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 150"
                value={formData.price_per_day}
                onChangeText={(text) => setFormData({ ...formData, price_per_day: text })}
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={[styles.submitButton, creating && styles.submitButtonDisabled]}
                onPress={handleCreateBed}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Add Bed</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9FF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A237E' },
  addButton: { padding: 4 },
  statsContainer: { flexDirection: 'row', padding: 16, gap: 8 },
  statBox: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#1976D2' },
  statLabel: { fontSize: 11, color: '#757575', marginTop: 4 },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  filterButton: { flex: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center' },
  filterButtonActive: { backgroundColor: '#1976D2', borderColor: '#1976D2' },
  filterText: { fontSize: 14, color: '#546E7A', fontWeight: '500' },
  filterTextActive: { color: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 16, color: '#757575', marginTop: 16, marginBottom: 24 },
  createButton: { backgroundColor: '#1976D2', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  createButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  listContent: { padding: 16 },
  bedCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  bedHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  bedIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  bedInfo: { flex: 1 },
  bedName: { fontSize: 16, fontWeight: 'bold', color: '#1A237E' },
  bedType: { fontSize: 12, color: '#757575', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600', color: '#FFFFFF' },
  bedDetails: { gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 14, color: '#546E7A' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A237E' },
  modalForm: { padding: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#1A237E', marginBottom: 8, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, fontSize: 16, color: '#263238', backgroundColor: '#FFFFFF' },
  pickerContainer: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, backgroundColor: '#FFFFFF' },
  submitButton: { backgroundColor: '#1976D2', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 24, marginBottom: 20 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});