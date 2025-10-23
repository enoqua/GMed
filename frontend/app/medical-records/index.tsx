import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { format } from 'date-fns';

export default function MedicalRecordsScreen() {
  const router = useRouter();
  const [records, setRecords] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const response = await api.get('/patients/my-medical-records');
      setRecords(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load medical records');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRecords();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1A237E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Medical Records</Text>
          <View style={{ width: 24 }} />
          </View>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A237E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medical Records</Text>
        <TouchableOpacity onPress={() => router.push('/medical-records/add' as any)}>
          <Ionicons name="add-circle" size={28} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={styles.accessCodeCard}>
          <View style={styles.accessCodeHeader}>
            <Ionicons name="key" size={24} color="#4CAF50" />
            <Text style={styles.accessCodeTitle}>Access Code</Text>
          </View>
          <Text style={styles.accessCode}>{records?.access_code || 'N/A'}</Text>
          <Text style={styles.accessCodeInfo}>
            Share this code with healthcare providers to access your records
          </Text>
          <TouchableOpacity
            style={styles.changeCodeButton}
            onPress={() => router.push('/medical-records/change-code' as any)}
          >
            <Text style={styles.changeCodeText}>Change Code</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Blood Type:</Text>
              <Text style={styles.infoValue}>{records?.blood_type || 'Not specified'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Allergies:</Text>
              <Text style={styles.infoValue}>
                {records?.allergies?.length > 0 ? records.allergies.join(', ') : 'None'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Emergency Contact:</Text>
              <Text style={styles.infoValue}>{records?.emergency_contact || 'Not set'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medical History</Text>
          {records?.medical_history?.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color="#BDBDBD" />
              <Text style={styles.emptyText}>No medical records yet</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/medical-records/add' as any)}
              >
                <Text style={styles.addButtonText}>Add Record</Text>
              </TouchableOpacity>
            </View>
          ) : (
            records?.medical_history?.map((record: any, index: number) => (
              <View key={index} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <Ionicons name="medical" size={20} color="#4CAF50" />
                  <Text style={styles.recordTitle}>{record.title}</Text>
                </View>
                <Text style={styles.recordType}>{record.record_type}</Text>
                <Text style={styles.recordDescription}>{record.description}</Text>
                <Text style={styles.recordDate}>
                  {record.created_at ? format(new Date(record.created_at), 'MMM dd, yyyy') : ''}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
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
    padding: 16,
  },
  accessCodeCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  accessCodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  accessCodeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  accessCode: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    letterSpacing: 4,
    marginBottom: 8,
  },
  accessCodeInfo: {
    fontSize: 12,
    color: '#546E7A',
    marginBottom: 12,
  },
  changeCodeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  changeCodeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  infoLabel: {
    fontSize: 14,
    color: '#546E7A',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#263238',
  },
  recordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  recordType: {
    fontSize: 12,
    color: '#4CAF50',
    marginBottom: 8,
  },
  recordDescription: {
    fontSize: 14,
    color: '#546E7A',
    marginBottom: 8,
  },
  recordDate: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 16,
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});