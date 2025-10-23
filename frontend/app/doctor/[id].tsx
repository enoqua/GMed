import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../../services/api';

interface Doctor {
  id: string;
  full_name: string;
  specialty: string;
  location: string;
  consultation_fee: number;
  rating: number;
  total_reviews: number;
  bio: string;
  years_of_experience: number;
}

export default function DoctorDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingData, setBookingData] = useState({
    appointment_type: 'video',
    scheduled_time: new Date(),
    reason: '',
  });
  const [tempDate, setTempDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDoctor();
  }, [id]);

  const fetchDoctor = async () => {
    try {
      const response = await api.get(`/doctors/${id}`);
      setDoctor(response.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load doctor details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!bookingData.reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for the appointment');
      return;
    }

    if (bookingData.scheduled_time < new Date()) {
      Alert.alert('Error', 'Please select a future date and time');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/appointments', {
        doctor_id: id,
        appointment_type: bookingData.appointment_type,
        scheduled_time: bookingData.scheduled_time.toISOString(),
        reason: bookingData.reason,
      });

      Alert.alert('Success', 'Appointment booked successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setShowBooking(false);
            router.push('/(tabs)/appointments');
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to book appointment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </SafeAreaView>
    );
  }

  if (!doctor) {
    return null;
  }

  if (showBooking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowBooking(false)}>
            <Ionicons name="arrow-back" size={24} color="#1A237E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Book Appointment</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.bookingContent}>
          <Text style={styles.sectionTitle}>Select Appointment Type</Text>
          <View style={styles.typeButtons}>
            {['video', 'audio', 'in-person'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  bookingData.appointment_type === type && styles.typeButtonActive,
                ]}
                onPress={() => setBookingData({ ...bookingData, appointment_type: type })}
              >
                <Ionicons
                  name={
                    type === 'video'
                      ? 'videocam'
                      : type === 'audio'
                      ? 'call'
                      : 'person'
                  }
                  size={24}
                  color={bookingData.appointment_type === type ? '#FFFFFF' : '#546E7A'}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    bookingData.appointment_type === type && styles.typeButtonTextActive,
                  ]}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Date & Time</Text>
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#546E7A" />
            <Text style={styles.dateTimeText}>
              {bookingData.scheduled_time.toLocaleDateString()}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Ionicons name="time-outline" size={20} color="#546E7A" />
            <Text style={styles.dateTimeText}>
              {bookingData.scheduled_time.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={bookingData.scheduled_time}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={(event, selectedDate) => {
                if (Platform.OS === 'android') {
                  setShowDatePicker(false);
                }
                
                if (event.type === 'set' && selectedDate) {
                  // Preserve the time from current scheduled_time
                  const currentTime = bookingData.scheduled_time;
                  const newDate = new Date(selectedDate);
                  newDate.setHours(currentTime.getHours());
                  newDate.setMinutes(currentTime.getMinutes());
                  newDate.setSeconds(0);
                  newDate.setMilliseconds(0);
                  
                  setBookingData({ ...bookingData, scheduled_time: newDate });
                } else if (event.type === 'dismissed') {
                  setShowDatePicker(false);
                }
              }}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={bookingData.scheduled_time}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedTime) => {
                if (Platform.OS === 'android') {
                  setShowTimePicker(false);
                }
                
                if (event.type === 'set' && selectedTime) {
                  // Preserve the date from current scheduled_time, update only time
                  const currentDate = bookingData.scheduled_time;
                  const newDateTime = new Date(currentDate);
                  newDateTime.setHours(selectedTime.getHours());
                  newDateTime.setMinutes(selectedTime.getMinutes());
                  newDateTime.setSeconds(0);
                  newDateTime.setMilliseconds(0);
                  
                  setBookingData({ ...bookingData, scheduled_time: newDateTime });
                } else if (event.type === 'dismissed') {
                  setShowTimePicker(false);
                }
              }}
            />
          )}

          <Text style={styles.sectionTitle}>Reason for Visit</Text>
          <TextInput
            style={styles.reasonInput}
            placeholder="Describe your symptoms or reason for consultation..."
            value={bookingData.reason}
            onChangeText={(text) => setBookingData({ ...bookingData, reason: text })}
            multiline
            numberOfLines={4}
            placeholderTextColor="#BDBDBD"
          />

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Appointment Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Doctor:</Text>
              <Text style={styles.summaryValue}>{doctor.full_name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Fee:</Text>
              <Text style={styles.summaryValue}>GHS {doctor.consultation_fee.toFixed(2)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.bookButton, submitting && styles.bookButtonDisabled]}
            onPress={handleBookAppointment}
            disabled={submitting}
          >
            <Text style={styles.bookButtonText}>
              {submitting ? 'Booking...' : 'Confirm Booking'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A237E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Doctor Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.doctorHeader}>
          <View style={styles.doctorAvatar}>
            <Ionicons name="person" size={48} color="#4CAF50" />
          </View>
          <Text style={styles.doctorName}>{doctor.full_name}</Text>
          <Text style={styles.specialty}>{doctor.specialty}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={18} color="#FFB300" />
            <Text style={styles.rating}>
              {doctor.rating.toFixed(1)} ({doctor.total_reviews} reviews)
            </Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="briefcase" size={24} color="#4CAF50" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Experience</Text>
              <Text style={styles.infoValue}>{doctor.years_of_experience} years</Text>
            </View>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="location" size={24} color="#2196F3" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{doctor.location}</Text>
            </View>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="cash" size={24} color="#FF9800" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Consultation Fee</Text>
              <Text style={styles.infoValue}>GHS {doctor.consultation_fee.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.bioSection}>
          <Text style={styles.bioTitle}>About</Text>
          <Text style={styles.bioText}>{doctor.bio}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.bookAppointmentButton}
          onPress={() => setShowBooking(true)}
        >
          <Text style={styles.bookAppointmentButtonText}>Book Appointment</Text>
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
    paddingBottom: 100,
  },
  doctorHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  doctorAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  doctorName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  specialty: {
    fontSize: 16,
    color: '#4CAF50',
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  rating: {
    fontSize: 14,
    color: '#546E7A',
  },
  infoSection: {
    padding: 16,
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#757575',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
    marginTop: 4,
  },
  bioSection: {
    padding: 16,
  },
  bioTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 12,
  },
  bioText: {
    fontSize: 14,
    color: '#546E7A',
    lineHeight: 22,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  bookAppointmentButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookAppointmentButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
    marginTop: 16,
    marginBottom: 12,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  typeButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  typeButtonText: {
    fontSize: 12,
    color: '#546E7A',
    marginTop: 8,
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 12,
    marginBottom: 12,
  },
  dateTimeText: {
    fontSize: 16,
    color: '#263238',
  },
  reasonInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: 16,
    color: '#263238',
    textAlignVertical: 'top',
    minHeight: 120,
  },
  summaryCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
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
    color: '#263238',
  },
  bookButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  bookButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});