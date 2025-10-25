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

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  department: string;
  duration: number;
  available: boolean;
}

export default function ServicesScreen() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    department: 'General',
    duration: '30',
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await api.get('/hospital/services');
      setServices(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
      Alert.alert('Error', 'Failed to load services');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchServices();
  };

  const handleCreateService = async () => {
    if (!formData.name || !formData.description || !formData.price) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      setCreating(true);
      await api.post('/hospital/services', {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        department: formData.department,
        duration: parseInt(formData.duration),
      });

      Alert.alert('Success', 'Service created successfully');
      setModalVisible(false);
      setFormData({ name: '', description: '', price: '', department: 'General', duration: '30' });
      fetchServices();
    } catch (error: any) {
      console.error('Error creating service:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create service');
    } finally {
      setCreating(false);
    }
  };

  const renderService = ({ item }: { item: Service }) => (
    <TouchableOpacity style={styles.serviceCard}>
      <View style={styles.serviceHeader}>
        <View style={styles.serviceIcon}>
          <Ionicons name="medical" size={24} color="#4CAF50" />
        </View>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{item.name}</Text>
          <Text style={styles.serviceDescription} numberOfLines={2}>{item.description}</Text>
        </View>
      </View>

      <View style={styles.serviceDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="business" size={16} color="#757575" />
          <Text style={styles.detailText}>{item.department}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time" size={16} color="#757575" />
          <Text style={styles.detailText}>{item.duration} minutes</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="cash" size={16} color="#757575" />
          <Text style={styles.priceText}>GH₵ {item.price}</Text>
        </View>
      </View>

      {item.available && (
        <View style={styles.availableBadge}>
          <Text style={styles.availableText}>Available</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A237E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hospital Services</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
          <Ionicons name="add-circle" size={28} color="#1976D2" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
        </View>
      ) : services.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="medical-outline" size={64} color="#BDBDBD" />
          <Text style={styles.emptyText}>No services yet</Text>
          <TouchableOpacity style={styles.createButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.createButtonText}>Add First Service</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={services}
          keyExtractor={(item) => item.id}
          renderItem={renderService}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Service</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#546E7A" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.inputLabel}>Service Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., X-Ray Scan"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />

              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the service"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>Price (GH₵) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 150"
                value={formData.price}
                onChangeText={(text) => setFormData({ ...formData, price: text })}
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Department *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Radiology"
                value={formData.department}
                onChangeText={(text) => setFormData({ ...formData, department: text })}
              />

              <Text style={styles.inputLabel}>Duration (minutes) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 30"
                value={formData.duration}
                onChangeText={(text) => setFormData({ ...formData, duration: text })}
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={[styles.submitButton, creating && styles.submitButtonDisabled]}
                onPress={handleCreateService}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Add Service</Text>
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 16, color: '#757575', marginTop: 16, marginBottom: 24 },
  createButton: { backgroundColor: '#1976D2', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  createButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  listContent: { padding: 16 },
  serviceCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  serviceHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  serviceIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 16, fontWeight: 'bold', color: '#1A237E', marginBottom: 4 },
  serviceDescription: { fontSize: 13, color: '#546E7A', lineHeight: 18 },
  serviceDetails: { gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 14, color: '#546E7A' },
  priceText: { fontSize: 14, color: '#4CAF50', fontWeight: '600' },
  availableBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: '#4CAF50', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  availableText: { fontSize: 11, fontWeight: '600', color: '#FFFFFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A237E' },
  modalForm: { padding: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#1A237E', marginBottom: 8, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, fontSize: 16, color: '#263238', backgroundColor: '#FFFFFF' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  submitButton: { backgroundColor: '#1976D2', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 24, marginBottom: 20 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});