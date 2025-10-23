import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const paymentMethods = [
  { id: 'mtn_momo', name: 'MTN Mobile Money', icon: 'phone-portrait', color: '#FFB300' },
  { id: 'vodafone_cash', name: 'Vodafone Cash', icon: 'phone-portrait', color: '#F44336' },
  { id: 'airteltigo', name: 'AirtelTigo Money', icon: 'phone-portrait', color: '#2196F3' },
];

export default function AddPaymentMethodScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    method_type: 'mtn_momo',
    phone_number: '',
    account_name: '',
  });
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!formData.phone_number || !formData.account_name) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (formData.phone_number.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      await api.post('/payments/methods', formData);

      Alert.alert('Success', 'Payment method added successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'Failed to add payment method'
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedMethod = paymentMethods.find((m) => m.id === formData.method_type);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A237E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Payment Method</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.label}>Select Payment Method</Text>
          <View style={styles.methodsGrid}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.methodCard,
                  formData.method_type === method.id && styles.methodCardActive,
                ]}
                onPress={() => setFormData({ ...formData, method_type: method.id })}
              >
                <View
                  style={[
                    styles.methodIcon,
                    { backgroundColor: method.color + '20' },
                    formData.method_type === method.id && { backgroundColor: method.color },
                  ]}
                >
                  <Ionicons
                    name={method.icon as any}
                    size={32}
                    color={formData.method_type === method.id ? '#FFFFFF' : method.color}
                  />
                </View>
                <Text style={styles.methodName}>{method.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Account Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            value={formData.account_name}
            onChangeText={(text) => setFormData({ ...formData, account_name: text })}
            placeholderTextColor="#BDBDBD"
          />

          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="+233XXXXXXXXX"
            value={formData.phone_number}
            onChangeText={(text) => setFormData({ ...formData, phone_number: text })}
            keyboardType="phone-pad"
            placeholderTextColor="#BDBDBD"
          />

          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#2196F3" />
            <Text style={styles.infoText}>
              Your payment information is securely stored and will be used for future
              transactions.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAdd}
            disabled={loading}
          >
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>
              {loading ? 'Adding...' : 'Add Payment Method'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
  },
  flex: {
    flex: 1,
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#546E7A',
    marginBottom: 12,
    marginTop: 16,
  },
  methodsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  methodCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  methodCardActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  methodIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  methodName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#263238',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#263238',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#546E7A',
    lineHeight: 18,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 32,
  },
  buttonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});