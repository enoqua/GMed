import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const EMERGENCY_TYPES = [
  { id: 'accident', name: 'Accident', icon: 'car', color: '#F44336' },
  { id: 'cardiac', name: 'Cardiac Emergency', icon: 'heart', color: '#E91E63' },
  { id: 'respiratory', name: 'Respiratory', icon: 'fitness', color: '#FF9800' },
  { id: 'stroke', name: 'Stroke', icon: 'alert-circle', color: '#9C27B0' },
  { id: 'trauma', name: 'Trauma', icon: 'medkit', color: '#F44336' },
  { id: 'other', name: 'Other', icon: 'help-circle', color: '#757575' },
];

export default function AmbulanceBookingScreen() {
  const router = useRouter();
  const { ambulance_id, service_name } = useLocalSearchParams();
  
  const [bookingType, setBookingType] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduledDate, setScheduledDate] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [emergencyType, setEmergencyType] = useState('accident');
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientCondition, setPatientCondition] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBooking = async () => {
    // Validation
    if (!pickupAddress.trim()) {
      Alert.alert('Missing Information', 'Please enter pickup address');
      return;
    }
    if (!destinationAddress.trim()) {
      Alert.alert('Missing Information', 'Please enter destination address');
      return;
    }
    if (!patientName.trim()) {
      Alert.alert('Missing Information', 'Please enter patient name');
      return;
    }
    if (!patientPhone.trim()) {
      Alert.alert('Missing Information', 'Please enter patient phone');
      return;
    }
    if (!patientCondition.trim()) {
      Alert.alert('Missing Information', 'Please describe patient condition');
      return;
    }
    if (bookingType === 'scheduled' && !scheduledDate.trim()) {
      Alert.alert('Missing Information', 'Please enter scheduled date and time');
      return;
    }

    setLoading(true);
    try {
      const bookingData = {
        ambulance_id: ambulance_id as string,
        booking_type: bookingType,
        scheduled_datetime: bookingType === 'scheduled' ? scheduledDate : undefined,
        pickup_address: pickupAddress,
        destination_address: destinationAddress,
        emergency_type: emergencyType,
        patient_name: patientName,
        patient_phone: patientPhone,
        patient_condition: patientCondition,
        additional_notes: additionalNotes || undefined,
      };

      const response = await api.post('/ambulance/book', bookingData);
      
      Alert.alert(
        'Booking Confirmed!',
        `Service: ${response.data.service_name}\nDriver: ${response.data.driver_name}\nPhone: ${response.data.driver_phone}\nVehicle: ${response.data.vehicle_number}\nEstimated Distance: ${response.data.estimated_distance_km} km\nTotal Price: GH₵ ${response.data.total_price.toFixed(2)}`,
        [
          {
            text: 'Track Ambulance',
            onPress: () => router.replace(`/ambulance-booking/track/${response.data.booking_id}`),
          },
        ]
      );
    } catch (error: any) {
      console.error('Booking error:', error);
      Alert.alert('Booking Failed', error.response?.data?.detail || 'Failed to book ambulance');
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
        <Text style={styles.headerTitle}>Book Ambulance</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.emergencyBanner}>
            <Ionicons name="warning" size={24} color="#F44336" />
            <Text style={styles.emergencyText}>
              For life-threatening emergencies, call 112 or 193 immediately
            </Text>
          </View>

          {service_name && (
            <View style={styles.serviceCard}>
              <Ionicons name="car" size={32} color="#F44336" />
              <Text style={styles.serviceName}>{service_name}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Booking Type</Text>
            <View style={styles.bookingTypeRow}>
              <TouchableOpacity
                style={[
                  styles.bookingTypeButton,
                  bookingType === 'immediate' && styles.bookingTypeButtonActive,
                ]}
                onPress={() => setBookingType('immediate')}
              >
                <Ionicons
                  name="flash"
                  size={24}
                  color={bookingType === 'immediate' ? '#FFFFFF' : '#757575'}
                />
                <Text
                  style={[
                    styles.bookingTypeText,
                    bookingType === 'immediate' && styles.bookingTypeTextActive,
                  ]}
                >
                  Immediate
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.bookingTypeButton,
                  bookingType === 'scheduled' && styles.bookingTypeButtonActive,
                ]}
                onPress={() => setBookingType('scheduled')}
              >
                <Ionicons
                  name="calendar"
                  size={24}
                  color={bookingType === 'scheduled' ? '#FFFFFF' : '#757575'}
                />
                <Text
                  style={[
                    styles.bookingTypeText,
                    bookingType === 'scheduled' && styles.bookingTypeTextActive,
                  ]}
                >
                  Scheduled
                </Text>
              </TouchableOpacity>
            </View>

            {bookingType === 'scheduled' && (
              <TextInput
                style={styles.input}
                placeholder="Date & Time (e.g., 2025-06-15T14:30:00)"
                value={scheduledDate}
                onChangeText={setScheduledDate}
                placeholderTextColor="#BDBDBD"
              />
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Emergency Type</Text>
            <View style={styles.emergencyTypesGrid}>
              {EMERGENCY_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.emergencyTypeCard,
                    emergencyType === type.id && { borderColor: type.color, borderWidth: 2 },
                  ]}
                  onPress={() => setEmergencyType(type.id)}
                >
                  <Ionicons name={type.icon as any} size={32} color={type.color} />
                  <Text style={styles.emergencyTypeName}>{type.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location Details</Text>
            <TextInput
              style={styles.input}
              placeholder="Pickup Address *"
              value={pickupAddress}
              onChangeText={setPickupAddress}
              placeholderTextColor="#BDBDBD"
              multiline
            />
            <TextInput
              style={styles.input}
              placeholder="Destination Address (Hospital/Clinic) *"
              value={destinationAddress}
              onChangeText={setDestinationAddress}
              placeholderTextColor="#BDBDBD"
              multiline
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Patient Information</Text>
            <TextInput
              style={styles.input}
              placeholder="Patient Name *"
              value={patientName}
              onChangeText={setPatientName}
              placeholderTextColor="#BDBDBD"
            />
            <TextInput
              style={styles.input}
              placeholder="Patient Phone *"
              value={patientPhone}
              onChangeText={setPatientPhone}
              keyboardType="phone-pad"
              placeholderTextColor="#BDBDBD"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Patient Condition (symptoms, severity) *"
              value={patientCondition}
              onChangeText={setPatientCondition}
              placeholderTextColor="#BDBDBD"
              multiline
              numberOfLines={4}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Additional Notes (optional)"
              value={additionalNotes}
              onChangeText={setAdditionalNotes}
              placeholderTextColor="#BDBDBD"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.pricingInfo}>
            <Ionicons name="information-circle" size={20} color="#2196F3" />
            <Text style={styles.pricingText}>
              Pricing: GH₵50 base fare + GH₵5 per km
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.bookButton, loading && styles.bookButtonDisabled]}
            onPress={handleBooking}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.bookButtonText}>Confirm Booking</Text>
              </>
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
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  emergencyText: {
    flex: 1,
    fontSize: 12,
    color: '#D32F2F',
    fontWeight: '600',
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
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
  bookingTypeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bookingTypeButton: {
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
  bookingTypeButtonActive: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  bookingTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#757575',
  },
  bookingTypeTextActive: {
    color: '#FFFFFF',
  },
  emergencyTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emergencyTypeCard: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: '#F5F9FF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  emergencyTypeName: {
    fontSize: 11,
    color: '#546E7A',
    textAlign: 'center',
    marginTop: 4,
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
  pricingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
  },
  pricingText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '600',
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
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F44336',
    paddingVertical: 16,
    borderRadius: 12,
  },
  bookButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});