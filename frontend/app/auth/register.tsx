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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

export default function RegisterScreen() {
  const router = useRouter();
  const { role: queryRole } = useLocalSearchParams();
  const login = useAuthStore((state) => state.login);
  const [selectedRole, setSelectedRole] = useState((queryRole as string) || 'patient');
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    national_id: '',
    password: '',
    confirmPassword: '',
    // Doctor fields
    specialty: '',
    license_number: '',
    consultation_fee: '',
    location: '',
    bio: '',
    years_of_experience: '',
    // Hospital fields
    hospital_name: '',
    services: '',
    operating_hours: '',
    // Pharmacy fields
    pharmacy_name: '',
    license_type: '',
    // Ambulance fields
    service_areas: '',
    vehicle_type: '',
    // Herbalist fields
    practice_years: '',
    specializations: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    const { full_name, email, phone, national_id, password, confirmPassword } = formData;

    if (!full_name || !email || !phone || !national_id || !password) {
      Alert.alert('Error', 'Please fill in all fields');
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

    setLoading(true);
    try {
      const response = await api.post('/auth/register', {
        full_name,
        email: email.toLowerCase().trim(),
        phone,
        national_id,
        password,
        role: 'patient',
      });

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
          <Ionicons name="medical" size={64} color="#4CAF50" />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Register as a Patient</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#546E7A" />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={formData.full_name}
              onChangeText={(text) => setFormData({ ...formData, full_name: text })}
              placeholderTextColor="#90A4AE"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#546E7A" />
            <TextInput
              style={styles.input}
              placeholder="Email"
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
              placeholder="Phone (+233XXXXXXXXX)"
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
              placeholder="National ID (Ghana)"
              value={formData.national_id}
              onChangeText={(text) => setFormData({ ...formData, national_id: text })}
              placeholderTextColor="#90A4AE"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#546E7A" />
            <TextInput
              style={styles.input}
              placeholder="Password"
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
              placeholder="Confirm Password"
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