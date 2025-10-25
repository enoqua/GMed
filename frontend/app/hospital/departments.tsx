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

interface Department {
  id: string;
  name: string;
  description: string;
  head_doctor?: string;
  contact_phone: string;
  services: string[];
  staff_count: number;
  status: string;
}

export default function DepartmentsScreen() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    head_doctor: '',
    contact_phone: '',
    services: '',
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/hospital/departments');
      setDepartments(response.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
      Alert.alert('Error', 'Failed to load departments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDepartments();
  };

  const handleCreateDepartment = async () => {
    if (!formData.name || !formData.description || !formData.contact_phone) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      setCreating(true);
      const servicesArray = formData.services
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      await api.post('/hospital/departments', {
        name: formData.name,
        description: formData.description,
        head_doctor: formData.head_doctor || 'Not assigned',
        contact_phone: formData.contact_phone,
        services: servicesArray.length > 0 ? servicesArray : ['General Services'],
      });

      Alert.alert('Success', 'Department created successfully');
      setModalVisible(false);
      setFormData({
        name: '',
        description: '',
        head_doctor: '',
        contact_phone: '',
        services: '',
      });
      fetchDepartments();
    } catch (error: any) {
      console.error('Error creating department:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create department');
    } finally {
      setCreating(false);
    }
  };

  const renderDepartment = ({ item }: { item: Department }) => (
    <TouchableOpacity style={styles.departmentCard}>
      <View style={styles.departmentHeader}>
        <View style={styles.departmentIcon}>
          <Ionicons name="business" size={28} color="#1976D2" />
        </View>
        <View style={styles.departmentInfo}>
          <Text style={styles.departmentName}>{item.name}</Text>
          <Text style={styles.departmentDescription} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
        {item.status === 'active' && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        )}
      </View>

      <View style={styles.departmentDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="person" size={16} color="#757575" />
          <Text style={styles.detailText}>Head: {item.head_doctor || 'Not assigned'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="call" size={16} color="#757575" />
          <Text style={styles.detailText}>{item.contact_phone}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="people" size={16} color="#757575" />
          <Text style={styles.detailText}>Staff: {item.staff_count}</Text>
        </View>
      </View>

      <View style={styles.servicesContainer}>
        <Text style={styles.servicesLabel}>Services:</Text>
        <View style={styles.servicesChips}>
          {item.services.map((service, index) => (
            <View key={index} style={styles.serviceChip}>
              <Text style={styles.serviceChipText}>{service}</Text>
            </View>
          ))}
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
        <Text style={styles.headerTitle}>Departments</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
          <Ionicons name="add-circle" size={28} color="#1976D2" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
        </View>
      ) : departments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="business-outline" size={64} color="#BDBDBD" />
          <Text style={styles.emptyText}>No departments yet</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.createButtonText}>Create First Department</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={departments}
          keyExtractor={(item) => item.id}
          renderItem={renderDepartment}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}

      {/* Create Department Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Department</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#546E7A" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.inputLabel}>Department Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Emergency Department"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />

              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the department"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>Head Doctor</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Dr. John Doe"
                value={formData.head_doctor}
                onChangeText={(text) => setFormData({ ...formData, head_doctor: text })}
              />

              <Text style={styles.inputLabel}>Contact Phone *</Text>
              <TextInput
                style={styles.input}
                placeholder="+233244000000"
                value={formData.contact_phone}
                onChangeText={(text) => setFormData({ ...formData, contact_phone: text })}
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Services (comma-separated)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g., Emergency Care, Trauma Surgery, Critical Care"
                value={formData.services}
                onChangeText={(text) => setFormData({ ...formData, services: text })}
                multiline
                numberOfLines={2}
              />

              <TouchableOpacity
                style={[styles.submitButton, creating && styles.submitButtonDisabled]}
                onPress={handleCreateDepartment}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Create Department</Text>
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  addButton: {
    padding: 4,
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
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  departmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  departmentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  departmentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  departmentInfo: {
    flex: 1,
  },
  departmentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
  },
  departmentDescription: {
    fontSize: 14,
    color: '#546E7A',
    lineHeight: 20,
  },
  activeBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  departmentDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#546E7A',
  },
  servicesContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
  },
  servicesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#546E7A',
    marginBottom: 8,
  },
  servicesChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  serviceChip: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  serviceChipText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  modalForm: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#263238',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#1976D2',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
