import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

interface Consultation {
  id: string;
  doctor_name: string;
  doctor_specialty: string;
  scheduled_datetime: string;
  consultation_type: string;
  status: string;
  reason: string;
  consultation_fee: number;
  payment_status: string;
  room_id: string;
}

const STATUS_CONFIG: Record<string, { color: string; icon: string }> = {
  scheduled: { color: '#2196F3', icon: 'calendar' },
  in_progress: { color: '#FF9800', icon: 'videocam' },
  completed: { color: '#4CAF50', icon: 'checkmark-circle' },
  cancelled: { color: '#F44336', icon: 'close-circle' },
};

export default function ConsultationsScreen() {
  const router = useRouter();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchConsultations();
  }, []);

  const fetchConsultations = async () => {
    try {
      const response = await api.get('/consultations/my-consultations');
      setConsultations(response.data);
    } catch (error) {
      console.error('Error fetching consultations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchConsultations();
  };

  const canJoinConsultation = (consultation: Consultation) => {
    const scheduledTime = new Date(consultation.scheduled_datetime);
    const now = new Date();
    const timeDiff = scheduledTime.getTime() - now.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    return consultation.status === 'scheduled' && minutesDiff <= 15 && minutesDiff >= -30;
  };

  const renderConsultation = (consultation: Consultation) => {
    const statusConfig = STATUS_CONFIG[consultation.status] || STATUS_CONFIG.scheduled;
    const scheduledDate = new Date(consultation.scheduled_datetime);
    const isJoinable = canJoinConsultation(consultation);

    return (
      <TouchableOpacity
        key={consultation.id}
        style={styles.consultationCard}
        onPress={() => router.push(`/consultations/${consultation.id}` as any)}
      >
        <View style={styles.consultationHeader}>
          <View style={styles.doctorIcon}>
            <Ionicons name="person" size={32} color="#2196F3" />
          </View>
          <View style={styles.consultationInfo}>
            <Text style={styles.doctorName}>{consultation.doctor_name}</Text>
            <Text style={styles.specialty}>{consultation.doctor_specialty}</Text>
            <View style={styles.dateRow}>
              <Ionicons name="calendar" size={14} color="#757575" />
              <Text style={styles.dateText}>{scheduledDate.toLocaleDateString()}</Text>
              <Ionicons name="time" size={14} color="#757575" style={{ marginLeft: 8 }} />
              <Text style={styles.dateText}>{scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
            <Ionicons name={statusConfig.icon as any} size={16} color={statusConfig.color} />
          </View>
        </View>

        <View style={styles.consultationDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="chatbubble-ellipses" size={16} color="#757575" />
            <Text style={styles.detailText}>{consultation.reason}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name={consultation.consultation_type === 'video' ? 'videocam' : 'call'} size={16} color="#757575" />
            <Text style={styles.detailText}>{consultation.consultation_type === 'video' ? 'Video Call' : 'Audio Call'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="cash" size={16} color="#4CAF50" />
            <Text style={[styles.detailText, { color: '#4CAF50', fontWeight: '600' }]}>
              GH₵ {consultation.consultation_fee.toFixed(2)}
            </Text>
          </View>
        </View>

        {isJoinable && (
          <TouchableOpacity
            style={styles.joinButton}
            onPress={() => router.push(`/consultations/room/${consultation.id}` as any)}
          >
            <Ionicons name="videocam" size={20} color="#FFFFFF" />
            <Text style={styles.joinButtonText}>Join Consultation</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A237E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Consultations</Text>
        <TouchableOpacity onPress={() => router.push('/consultations/schedule')}>
          <Ionicons name="add-circle" size={24} color="#2196F3" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : consultations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="videocam" size={80} color="#BDBDBD" />
          <Text style={styles.emptyText}>No consultations yet</Text>
          <TouchableOpacity
            style={styles.scheduleButton}
            onPress={() => router.push('/consultations/schedule')}
          >
            <Text style={styles.scheduleButtonText}>Schedule Consultation</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {consultations.map(renderConsultation)}
        </ScrollView>
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
  content: {
    padding: 16,
  },
  consultationCard: {
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
  consultationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  doctorIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  consultationInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
  },
  specialty: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#757575',
  },
  statusBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consultationDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#546E7A',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
    fontSize: 18,
    color: '#757575',
    marginTop: 16,
    marginBottom: 24,
  },
  scheduleButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  scheduleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});