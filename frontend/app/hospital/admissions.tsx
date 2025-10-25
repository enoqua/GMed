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
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

interface Admission {
  id: string;
  patient_name: string;
  admission_date: string;
  department: string;
  bed_number: string;
  diagnosis: string;
  status: string;
  doctor_name?: string;
}

export default function AdmissionsScreen() {
  const router = useRouter();
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAdmissions();
  }, []);

  const fetchAdmissions = async () => {
    try {
      const response = await api.get('/hospital/admissions');
      setAdmissions(response.data);
    } catch (error) {
      console.error('Error fetching admissions:', error);
      Alert.alert('Error', 'Failed to load admissions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAdmissions();
  };

  const renderAdmission = ({ item }: { item: Admission }) => (
    <TouchableOpacity style={styles.admissionCard}>
      <View style={styles.admissionHeader}>
        <View style={styles.patientIcon}>
          <Ionicons name="person" size={24} color="#1976D2" />
        </View>
        <View style={styles.admissionInfo}>
          <Text style={styles.patientName}>{item.patient_name}</Text>
          <Text style={styles.diagnosis}>{item.diagnosis}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? '#4CAF50' : '#FF9800' }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.admissionDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color="#757575" />
          <Text style={styles.detailText}>Admitted: {new Date(item.admission_date).toLocaleDateString()}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="business" size={16} color="#757575" />
          <Text style={styles.detailText}>{item.department}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="bed" size={16} color="#757575" />
          <Text style={styles.detailText}>Bed: {item.bed_number}</Text>
        </View>
        {item.doctor_name && (
          <View style={styles.detailRow}>
            <Ionicons name="medkit" size={16} color="#757575" />
            <Text style={styles.detailText}>Dr. {item.doctor_name}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const activeCount = admissions.filter(a => a.status === 'active').length;
  const dischargedCount = admissions.filter(a => a.status === 'discharged').length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A237E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Patient Admissions</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{admissions.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#4CAF50' }]}>{activeCount}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#FF9800' }]}>{dischargedCount}</Text>
          <Text style={styles.statLabel}>Discharged</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
        </View>
      ) : admissions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="clipboard-outline" size={64} color="#BDBDBD" />
          <Text style={styles.emptyText}>No admissions found</Text>
        </View>
      ) : (
        <FlatList
          data={admissions}
          keyExtractor={(item) => item.id}
          renderItem={renderAdmission}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9FF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A237E' },
  placeholder: { width: 32 },
  statsContainer: { flexDirection: 'row', padding: 16, gap: 12 },
  statBox: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#1976D2' },
  statLabel: { fontSize: 12, color: '#757575', marginTop: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 16, color: '#757575', marginTop: 16 },
  listContent: { padding: 16 },
  admissionCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  admissionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  patientIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  admissionInfo: { flex: 1 },
  patientName: { fontSize: 16, fontWeight: 'bold', color: '#1A237E' },
  diagnosis: { fontSize: 13, color: '#546E7A', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600', color: '#FFFFFF' },
  admissionDetails: { gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 14, color: '#546E7A' },
});