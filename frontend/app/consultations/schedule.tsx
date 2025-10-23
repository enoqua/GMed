import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

interface Doctor {
  id: string;
  full_name: string;
  specialty: string;
  consultation_fee: number;
  location: string;
}

export default function ScheduleConsultationScreen() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [consultationType, setConsultationType] = useState<'video' | 'audio'>('video');
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [reason, setReason] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const response = await api.get('/doctors');
      setDoctors(response.data);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const handleSchedule = async () => {
    if (!selectedDoctor) {
      Alert.alert('Missing Information', 'Please select a doctor');
      return;
    }
    if (!scheduledDateTime.trim()) {
      Alert.alert('Missing Information', 'Please enter date and time');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Missing Information', 'Please enter reason for consultation');
      return;
    }

    setLoading(true);
    try {
      const consultationData = {
        doctor_id: selectedDoctor.id,
        scheduled_datetime: scheduledDateTime,
        consultation_type: consultationType,
        reason,
        symptoms: symptoms || undefined,
      };

      const response = await api.post('/consultations/schedule', consultationData);
      
      Alert.alert(
        'Consultation Scheduled!',
        `Doctor: ${response.data.doctor_name}\nDate: ${scheduledDateTime}\nFee: GH₵ ${response.data.consultation_fee.toFixed(2)}\nRoom ID: ${response.data.room_id}`,
        [
          {
            text: 'View Consultations',
            onPress: () => router.replace('/consultations'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Schedule error:', error);
      Alert.alert('Scheduling Failed', error.response?.data?.detail || 'Failed to schedule consultation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A237E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Schedule Consultation</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Doctor</Text>
            {loadingDoctors ? (
              <ActivityIndicator size="small" color="#2196F3" />
            ) : doctors.length === 0 ? (
              <Text style={styles.noDoctorsText}>No doctors available</Text>
            ) : (
              doctors.map((doctor) => (
                <TouchableOpacity
                  key={doctor.id}
                  style={[
                    styles.doctorCard,
                    selectedDoctor?.id === doctor.id && styles.doctorCardSelected,
                  ]}
                  onPress={() => setSelectedDoctor(doctor)}
                >
                  <View style={styles.doctorIcon}>
                    <Ionicons name="person" size={24} color="#2196F3" />
                  </View>
                  <View style={styles.doctorInfo}>
                    <Text style={styles.doctorName}>{doctor.full_name}</Text>
                    <Text style={styles.specialty}>{doctor.specialty}</Text>
                    <Text style={styles.location}>{doctor.location}</Text>
                  </View>
                  <View style={styles.feeContainer}>
                    <Text style={styles.fee}>GH₵ {doctor.consultation_fee.toFixed(2)}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Consultation Type</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  consultationType === 'video' && styles.typeButtonActive,
                ]}
                onPress={() => setConsultationType('video')}
              >
                <Ionicons
                  name="videocam"
                  size={24}
                  color={consultationType === 'video' ? '#FFFFFF' : '#757575'}
                />
                <Text
                  style={[
                    styles.typeText,
                    consultationType === 'video' && styles.typeTextActive,
                  ]}
                >
                  Video Call
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  consultationType === 'audio' && styles.typeButtonActive,
                ]}
                onPress={() => setConsultationType('audio')}
              >
                <Ionicons
                  name="call"
                  size={24}
                  color={consultationType === 'audio' ? '#FFFFFF' : '#757575'}
                />
                <Text
                  style={[
                    styles.typeText,
                    consultationType === 'audio' && styles.typeTextActive,
                  ]}
                >
                  Audio Call
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Appointment Details</Text>
            <TextInput
              style={styles.input}
              placeholder="Date & Time (e.g., 2025-06-15T14:30:00) *"
              value={scheduledDateTime}
              onChangeText={setScheduledDateTime}
              placeholderTextColor="#BDBDBD"
            />
            <TextInput
              style={styles.input}
              placeholder="Reason for Consultation *"
              value={reason}
              onChangeText={setReason}
              placeholderTextColor="#BDBDBD"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Symptoms (optional)"
              value={symptoms}
              onChangeText={setSymptoms}
              placeholderTextColor="#BDBDBD"
              multiline
              numberOfLines={4}
            />
          </View>

          {selectedDoctor && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Consultation Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Doctor:</Text>
                <Text style={styles.summaryValue}>{selectedDoctor.full_name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Specialty:</Text>
                <Text style={styles.summaryValue}>{selectedDoctor.specialty}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Type:</Text>
                <Text style={styles.summaryValue}>
                  {consultationType === 'video' ? 'Video Call' : 'Audio Call'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Fee:</Text>
                <Text style={[styles.summaryValue, { color: '#4CAF50', fontWeight: 'bold' }]}>
                  GH₵ {selectedDoctor.consultation_fee.toFixed(2)}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.scheduleButton, loading && styles.scheduleButtonDisabled]}
            onPress={handleSchedule}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.scheduleButtonText}>Schedule Consultation</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingBottom: 100,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 12,
  },
  noDoctorsText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    paddingVertical: 16,
  },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  doctorCardSelected: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  doctorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  specialty: {
    fontSize: 12,
    color: '#757575',
  },
  location: {
    fontSize: 11,
    color: '#9E9E9E',
  },
  feeContainer: {
    alignItems: 'flex-end',
  },
  fee: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#F5F9FF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  typeButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#757575',
  },
  typeTextActive: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#F5F9FF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#263238',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  summaryCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#546E7A',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A237E',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  scheduleButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  scheduleButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  scheduleButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});