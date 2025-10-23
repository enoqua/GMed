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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

export default function ChangeAccessCodeScreen() {
  const router = useRouter();
  const [newCode, setNewCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangeCode = async () => {
    if (!newCode || !confirmCode) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newCode.length < 4) {
      Alert.alert('Error', 'Access code must be at least 4 characters');
      return;
    }

    if (newCode !== confirmCode) {
      Alert.alert('Error', 'Access codes do not match');
      return;
    }

    setLoading(true);
    try {
      await api.put('/patients/access-code', {
        new_access_code: newCode.toUpperCase(),
      });

      Alert.alert('Success', 'Access code updated successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'Failed to update access code'
      );
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
        <Text style={styles.headerTitle}>Change Access Code</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.content}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={48} color="#2196F3" />
            <Text style={styles.infoTitle}>Access Code Security</Text>
            <Text style={styles.infoText}>
              Your access code protects your medical records. Share it only with
              trusted healthcare providers.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>New Access Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter new access code"
              value={newCode}
              onChangeText={(text) => setNewCode(text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={8}
              placeholderTextColor="#BDBDBD"
            />

            <Text style={styles.label}>Confirm Access Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm new access code"
              value={confirmCode}
              onChangeText={(text) => setConfirmCode(text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={8}
              placeholderTextColor="#BDBDBD"
            />

            <Text style={styles.hint}>
              Use at least 4 characters. Mix letters and numbers for better security.
            </Text>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleChangeCode}
              disabled={loading}
            >
              <Ionicons name="key" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>
                {loading ? 'Updating...' : 'Update Access Code'}
              </Text>
            </TouchableOpacity>
          </View>
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
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    marginTop: 16,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#546E7A',
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#546E7A',
    marginBottom: -8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    letterSpacing: 4,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  hint: {
    fontSize: 12,
    color: '#757575',
    marginTop: -8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
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