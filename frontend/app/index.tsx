import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/(tabs)/home');
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="medical" size={80} color="#4CAF50" />
        <Text style={styles.title}>Glenx MedHub</Text>
        <Text style={styles.subtitle}>Your Healthcare Partner</Text>
      </View>

      <View style={styles.features}>
        <View style={styles.featureItem}>
          <Ionicons name="videocam" size={32} color="#2196F3" />
          <Text style={styles.featureText}>Video Consultations</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="calendar" size={32} color="#FF9800" />
          <Text style={styles.featureText}>Book Appointments</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="medkit" size={32} color="#E91E63" />
          <Text style={styles.featureText}>Find Doctors</Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={styles.primaryButtonText}>Login</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={() => router.push('/auth/register')}
        >
          <Text style={styles.secondaryButtonText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1A237E',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#546E7A',
    marginTop: 8,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 48,
  },
  featureItem: {
    alignItems: 'center',
    width: 100,
  },
  featureText: {
    marginTop: 8,
    fontSize: 12,
    color: '#37474F',
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  secondaryButtonText: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 18,
    color: '#546E7A',
  },
});