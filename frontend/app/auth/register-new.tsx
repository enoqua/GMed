import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

const roleInfo = {
  patient: { title: 'Patient', icon: 'person', color: '#4CAF50' },
  doctor: { title: 'Doctor', icon: 'medical', color: '#2196F3' },
  hospital: { title: 'Hospital', icon: 'business', color: '#9C27B0' },
  pharmacy: { title: 'Pharmacy', icon: 'flask', color: '#FF9800' },
  ambulance: { title: 'Ambulance', icon: 'car', color: '#F44336' },
  herbalist: { title: 'Herbalist', icon: 'leaf', color: '#4CAF50' },
};

export default function RegisterScreen() {
  const router = useRouter();
  const { role: queryRole } = useLocalSearchParams();
  const login = useAuthStore((state) => state.login);
  const selectedRole = (queryRole as string) || 'patient';
  const roleData = roleInfo[selectedRole as keyof typeof roleInfo] || roleInfo.patient;
  
  const [formData, setFormData] = useState<any>({
    full_name: '',
    email: '',
    phone: '',
    national_id: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    const { full_name, email, phone, national_id, password, confirmPassword } = formData;

    if (!full_name || !email || !phone || !national_id || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    const payload: any = {
      full_name,
      email: email.toLowerCase().trim(),
      phone,
      national_id,
      password,
      role: selectedRole,
    };

    // Add role-specific fields
    if (selectedRole === 'doctor') {
      if (!formData.specialty || !formData.consultation_fee) {
        Alert.alert('Error', 'Please fill in specialty and consultation fee');
        return;
      }
      payload.specialty = formData.specialty;
      payload.license_number = formData.license_number || 'PENDING';
      payload.consultation_fee = parseFloat(formData.consultation_fee);
      payload.location = formData.location || 'Not specified';
      payload.bio = formData.bio || 'Healthcare professional';
      payload.years_of_experience = parseInt(formData.years_of_experience) || 0;
    } else if (selectedRole === 'hospital') {
      payload.hospital_name = formData.hospital_name || full_name;
      payload.services = formData.services ? formData.services.split(',').map((s: string) => s.trim()) : [];
      payload.operating_hours = formData.operating_hours || '24/7';
      payload.location = formData.location || 'Not specified';
    } else if (selectedRole === 'pharmacy') {
      payload.pharmacy_name = formData.pharmacy_name || full_name;
      payload.license_number = formData.license_number || 'PENDING';
      payload.license_type = formData.license_type || 'retail';
      payload.location = formData.location || 'Not specified';
    } else if (selectedRole === 'ambulance') {
      payload.service_areas = formData.service_areas ? formData.service_areas.split(',').map((s: string) => s.trim()) : [];
      payload.vehicle_type = formData.vehicle_type || 'Standard';
      payload.location = formData.location || 'Not specified';
    } else if (selectedRole === 'herbalist') {
      payload.practice_years = parseInt(formData.practice_years) || 0;
      payload.specializations = formData.specializations ? formData.specializations.split(',').map((s: string) => s.trim()) : [];
      payload.location = formData.location || 'Not specified';
      payload.bio = formData.bio || 'Traditional medicine practitioner';
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/register', payload);
      await login(response.data.user, response.data.access_token);
      router.replace('/(tabs)/home');
    } catch (error: any) {
      Alert.alert(
        'Registration Failed',
        error.response?.data?.detail || 'An error occurred during registration'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderRoleFields = () => {
    if (selectedRole === 'doctor') {
      return (
        <>
          <View style={styles.inputContainer}>
            <Ionicons name="medical-outline" size={20} color="#546E7A" />
            <TextInput
              style={styles.input}
              placeholder="Specialty *"
              value={formData.specialty}
              onChangeText={(text) => setFormData({ ...formData, specialty: text })}
              placeholderTextColor="#90A4AE"
            />
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="card-outline" size={20} color="#546E7A" />
            <TextInput
              style={styles.input}
              placeholder="License Number"
              value={formData.license_number}
              onChangeText={(text) => setFormData({ ...formData, license_number: text })}
              placeholderTextColor="#90A4AE"
            />
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="cash-outline" size={20} color="#546E7A" />
            <TextInput
              style={styles.input}
              placeholder="Consultation Fee (GHS) *"
              value={formData.consultation_fee}
              onChangeText={(text) => setFormData({ ...formData, consultation_fee: text })}
              keyboardType="numeric"
              placeholderTextColor="#90A4AE"
            />
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="location-outline" size={20} color="#546E7A" />
            <TextInput
              style={styles.input}
              placeholder="Location/Clinic"
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
              placeholderTextColor="#90A4AE"
            />
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="time-outline" size={20} color="#546E7A" />
            <TextInput
              style={styles.input}
              placeholder="Years of Experience"
              value={formData.years_of_experience}
              onChangeText={(text) => setFormData({ ...formData, years_of_experience: text })}
              keyboardType="numeric"
              placeholderTextColor="#90A4AE"
            />
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="document-text-outline" size={20} color="#546E7A" />
            <TextInput
              style={styles.input}
              placeholder="Bio"
              value={formData.bio}
              onChangeText={(text) => setFormData({ ...formData, bio: text })}
              multiline
              placeholderTextColor="#90A4AE"
            />
          </View>
        </>
      );
    } else if (selectedRole === 'hospital') {
      return (
        <>
          <View style={styles.inputContainer}>
            <Ionicons name="business-outline" size={20} color="#546E7A" />
            <TextInput
              style={styles.input}
              placeholder="Hospital Name"
              value={formData.hospital_name}
              onChangeText={(text) => setFormData({ ...formData, hospital_name: text })}
              placeholderTextColor="#90A4AE"
            />
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="list-outline" size={20} color="#546E7A" />
            <TextInput
              style={styles.input}
              placeholder="Services (comma-separated)"
              value={formData.services}
              onChangeText={(text) => setFormData({ ...formData, services: text })}
              placeholderTextColor="#90A4AE"
            />
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="time-outline" size={20} color="#546E7A" />
            <TextInput
              style={styles.input}
              placeholder="Operating Hours"
              value={formData.operating_hours}
              onChangeText={(text) => setFormData({ ...formData, operating_hours: text })}
              placeholderTextColor="#90A4AE"
            />
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="location-outline" size={20} color="#546E7A" />
            <TextInput
              style={styles.input}
              placeholder="Location"
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
              placeholderTextColor="#90A4AE"
            />
          </View>
        </>
      );
    } else if (selectedRole === 'pharmacy') {
      return (
        <>
          <View style={styles.inputContainer}>
            <Ionicons name="flask-outline" size={20} color="#546E7A" />
            <TextInput
              style={styles.input}
              placeholder="Pharmacy Name"
              value={formData.pharmacy_name}
              onChangeText={(text) => setFormData({ ...formData, pharmacy_name: text })}
              placeholderTextColor="#90A4AE"
            />
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="card-outline" size={20} color="#546E7A" />
            <TextInput
              style={styles.input}
              placeholder="License Number"
              value={formData.license_number}
              onChangeText={(text) => setFormData({ ...formData, license_number: text })}
              placeholderTextColor="#90A4AE"
            />
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="pricetag-outline" size={20} color="#546E7A" />
            <TextInput
              style={styles.input}
              placeholder="License Type (e.g., retail)"
              value={formData.license_type}
              onChangeText={(text) => setFormData({ ...formData, license_type: text })}
              placeholderTextColor="#90A4AE"
            />
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="location-outline" size={20} color="#546E7A" />
            <TextInput
              style={styles.input}
              placeholder="Location"
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
              placeholderTextColor="#90A4AE"
            />
          </View>
        </>
      );
    } else if (selectedRole === 'ambulance') {
      return (
        <>
          <View style={styles.inputContainer}>
            <Ionicons name="map-outline" size={20} color="#546E7A" />
            <TextInput
              style={styles.input}
              placeholder="Service Areas (comma-separated)"
              value={formData.service_areas}
              onChangeText={(text) => setFormData({ ...formData, service_areas: text })}
              placeholderTextColor="#90A4AE"
            />
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="car-outline" size={20} color="#546E7A" />
            <TextInput
              style={styles.input}
              placeholder="Vehicle Type"
              value={formData.vehicle_type}
              onChangeText={(text) => setFormData({ ...formData, vehicle_type: text })}
              placeholderTextColor="#90A4AE"
            />
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="location-outline" size={20} color="#546E7A" />
            <TextInput
              style={styles.input}
              placeholder="Base Location"
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
              placeholderTextColor="#90A4AE"
            />
          </View>
        </>
      );
    } else if (selectedRole === 'herbalist') {
      return (
        <>
          <View style={styles.inputContainer}>
            <Ionicons name="time-outline" size={20} color="#546E7A" />
            <TextInput
              style={styles.input}
              placeholder="Years of Practice"
              value={formData.practice_years}
              onChangeText={(text) => setFormData({ ...formData, practice_years: text })}
              keyboardType="numeric"
              placeholderTextColor="#90A4AE"
            />
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="leaf-outline" size={20} color="#546E7A" />
            <TextInput
              style={styles.input}
              placeholder="Specializations (comma-separated)"
              value={formData.specializations}
              onChangeText={(text) => setFormData({ ...formData, specializations: text })}
              placeholderTextColor="#90A4AE"
            />
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="location-outline" size={20} color="#546E7A" />
            <TextInput
              style={styles.input}
              placeholder="Location"
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
              placeholderTextColor="#90A4AE"
            />
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="document-text-outline" size={20} color="#546E7A" />
            <TextInput
              style={styles.input}
              placeholder="Bio"
              value={formData.bio}
              onChangeText={(text) => setFormData({ ...formData, bio: text })}
              multiline
              placeholderTextColor="#90A4AE"
            />
          </View>
        </>
      );
    }
    return null;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#1A237E" />
          </TouchableOpacity>
          <Ionicons name={roleData.icon as any} size={64} color={roleData.color} />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Register as {roleData.title}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#546E7A" />
            <TextInput
              style={styles.input}
              placeholder="Full Name *"
              value={formData.full_name}
              onChangeText={(text) => setFormData({ ...formData, full_name: text })}
              placeholderTextColor="#90A4AE"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#546E7A" />
            <TextInput
              style={styles.input}
              placeholder="Email *"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#90A4AE"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color="#546E7A" />
            <TextInput
              style={styles.input}
              placeholder="Phone (+233XXXXXXXXX) *"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              keyboardType="phone-pad"
              placeholderTextColor="#90A4AE"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="card-outline" size={20} color="#546E7A" />
            <TextInput
              style={styles.input}
              placeholder="National ID (Ghana) *"
              value={formData.national_id}
              onChangeText={(text) => setFormData({ ...formData, national_id: text })}
              placeholderTextColor="#90A4AE"
            />
          </View>

          {renderRoleFields()}

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#546E7A" />
            <TextInput
              style={styles.input}
              placeholder="Password *"
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              secureTextEntry={!showPassword}
              placeholderTextColor="#90A4AE"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#546E7A"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#546E7A" />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password *"
              value={formData.confirmPassword}
              onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
              secureTextEntry={!showPassword}
              placeholderTextColor="#90A4AE"
            />
          </View>

          <TouchableOpacity
            style={[styles.registerButton, loading && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.registerButtonText}>
              {loading ? 'Creating Account...' : 'Register'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.loginLinkBold}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A237E',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#546E7A',
    marginTop: 8,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#263238',
  },
  registerButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  registerButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#546E7A',
  },
  loginLinkBold: {
    color: '#4CAF50',
    fontWeight: '600',
  },
});
