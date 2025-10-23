import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const roles = [
  {
    id: 'patient',
    title: 'Patient',
    icon: 'person',
    color: '#4CAF50',
    description: 'Access healthcare services and book appointments',
  },
  {
    id: 'doctor',
    title: 'Doctor',
    icon: 'medical',
    color: '#2196F3',
    description: 'Provide medical consultations and manage patients',
  },
  {
    id: 'hospital',
    title: 'Hospital',
    icon: 'business',
    color: '#9C27B0',
    description: 'Manage hospital services and departments',
  },
  {
    id: 'pharmacy',
    title: 'Pharmacy',
    icon: 'flask',
    color: '#FF9800',
    description: 'Sell medicines and manage inventory',
  },
  {
    id: 'ambulance',
    title: 'Ambulance Service',
    icon: 'car',
    color: '#F44336',
    description: 'Provide emergency transport services',
  },
  {
    id: 'herbalist',
    title: 'Herbalist',
    icon: 'leaf',
    color: '#4CAF50',
    description: 'Offer traditional herbal medicine consultations',
  },
];

export default function RoleSelectScreen() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleContinue = () => {
    if (selectedRole) {
      router.push({
        pathname: '/auth/register',
        params: { role: selectedRole },
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A237E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Your Role</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Choose how you want to use Glenx MedHub</Text>

        {roles.map((role) => (
          <TouchableOpacity
            key={role.id}
            style={[
              styles.roleCard,
              selectedRole === role.id && styles.roleCardSelected,
            ]}
            onPress={() => setSelectedRole(role.id)}
          >
            <View
              style={[
                styles.roleIcon,
                { backgroundColor: role.color + '20' },
                selectedRole === role.id && { backgroundColor: role.color },
              ]}
            >
              <Ionicons
                name={role.icon as any}
                size={32}
                color={selectedRole === role.id ? '#FFFFFF' : role.color}
              />
            </View>
            <View style={styles.roleInfo}>
              <Text style={styles.roleTitle}>{role.title}</Text>
              <Text style={styles.roleDescription}>{role.description}</Text>
            </View>
            {selectedRole === role.id && (
              <Ionicons name="checkmark-circle" size={24} color={role.color} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, !selectedRole && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!selectedRole}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
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
    padding: 16,
    paddingBottom: 100,
  },
  subtitle: {
    fontSize: 16,
    color: '#546E7A',
    marginBottom: 24,
    textAlign: 'center',
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  roleCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  roleIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  roleDescription: {
    fontSize: 12,
    color: '#546E7A',
    marginTop: 4,
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
  continueButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});