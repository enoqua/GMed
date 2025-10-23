import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import DoctorDashboard from '../../components/dashboards/DoctorDashboard';
import PharmacyDashboard from '../../components/dashboards/PharmacyDashboard';

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  // Show role-specific dashboard
  if (user?.role === 'doctor') {
    return (
      <SafeAreaView style={styles.container}>
        <DoctorDashboard userName={user.full_name} />
      </SafeAreaView>
    );
  }

  if (user?.role === 'pharmacy') {
    return (
      <SafeAreaView style={styles.container}>
        <PharmacyDashboard userName={user.full_name} />
      </SafeAreaView>
    );
  }

  if (user?.role === 'hospital') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Welcome,</Text>
              <Text style={styles.userName}>{user?.full_name || 'Guest'}</Text>
            </View>
            <Ionicons name="notifications-outline" size={28} color="#1A237E" />
          </View>

          <View style={styles.heroCard}>
            <Ionicons name="business" size={48} color="#9C27B0" />
            <Text style={styles.heroTitle}>Hospital Management</Text>
            <Text style={styles.heroSubtitle}>
              Manage departments, staff, and patient services
            </Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#F3E5F5' }]}>
              <Ionicons name=\"business\" size={32} color=\"#9C27B0\" />
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Departments</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name=\"people\" size={32} color=\"#4CAF50\" />
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Staff</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name=\"add-circle\" size={32} color=\"#9C27B0\" />
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Add Department</Text>
              <Text style={styles.actionSubtitle}>Create new hospital department</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (user?.role === 'ambulance') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Welcome,</Text>
              <Text style={styles.userName}>{user?.full_name || 'Guest'}</Text>
            </View>
            <Ionicons name="notifications-outline" size={28} color="#1A237E" />
          </View>

          <View style={styles.heroCard}>
            <Ionicons name="car" size={48} color="#F44336" />
            <Text style={styles.heroTitle}>Ambulance Service</Text>
            <Text style={styles.heroSubtitle}>
              Emergency medical transport and rescue operations
            </Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#FFEBEE' }]}>
              <Ionicons name="car" size={32} color="#F44336" />
              <Text style={styles.statValue}>Available</Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="navigate" size={32} color="#2196F3" />
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Active Trips</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="toggle" size={32} color="#F44336" />
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Update Availability</Text>
              <Text style={styles.actionSubtitle}>Set your service status</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (user?.role === 'herbalist') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Welcome,</Text>
              <Text style={styles.userName}>{user?.full_name || 'Guest'}</Text>
            </View>
            <Ionicons name=\"notifications-outline\" size={28} color=\"#1A237E\" />
          </View>

          <View style={styles.heroCard}>
            <Ionicons name=\"leaf\" size={48} color=\"#4CAF50\" />
            <Text style={styles.heroTitle}>Traditional Medicine</Text>
            <Text style={styles.heroSubtitle}>
              Herbal remedies and traditional healing practices
            </Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name=\"calendar\" size={32} color=\"#4CAF50\" />
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Consultations</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name=\"star\" size={32} color=\"#FFB300\" />
              <Text style={styles.statValue}>0.0</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/appointments')}>
            <Ionicons name=\"calendar\" size={32} color=\"#4CAF50\" />
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>View Appointments</Text>
              <Text style={styles.actionSubtitle}>Manage your consultations</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Default patient dashboard

  const quickActions = [
    {
      id: '1',
      title: 'Find Doctors',
      icon: 'medkit',
      color: '#4CAF50',
      route: '/doctors',
    },
    {
      id: '2',
      title: 'My Appointments',
      icon: 'calendar',
      color: '#2196F3',
      route: '/appointments',
    },
    {
      id: '3',
      title: 'Video Call',
      icon: 'videocam',
      color: '#FF9800',
      route: '/appointments',
    },
    {
      id: '4',
      title: 'Medical Records',
      icon: 'document-text',
      color: '#E91E63',
      route: '/profile',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName}>{user?.full_name || 'Guest'}</Text>
          </View>
          <Ionicons name="notifications-outline" size={28} color="#1A237E" />
        </View>

        <View style={styles.heroCard}>
          <Ionicons name="heart" size={48} color="#4CAF50" />
          <Text style={styles.heroTitle}>Your Health Matters</Text>
          <Text style={styles.heroSubtitle}>
            Book appointments with certified doctors anytime, anywhere
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionCard}
              onPress={() => router.push(action.route as any)}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: action.color + '20' }]}>
                <Ionicons name={action.icon as any} size={32} color={action.color} />
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Why Choose Glenx MedHub?</Text>
          <View style={styles.infoCard}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Certified Doctors</Text>
              <Text style={styles.infoSubtitle}>All doctors are verified and licensed</Text>
            </View>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="time" size={24} color="#2196F3" />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>24/7 Availability</Text>
              <Text style={styles.infoSubtitle}>Healthcare when you need it</Text>
            </View>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="shield-checkmark" size={24} color="#FF9800" />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Secure & Private</Text>
              <Text style={styles.infoSubtitle}>Your data is protected</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  greeting: {
    fontSize: 16,
    color: '#546E7A',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
    marginTop: 16,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#546E7A',
    textAlign: 'center',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#263238',
    textAlign: 'center',
  },
  infoSection: {
    marginTop: 8,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
  },
  infoSubtitle: {
    fontSize: 14,
    color: '#546E7A',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A237E',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#546E7A',
    marginTop: 4,
  },
  actionText: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#546E7A',
    marginTop: 2,
  },
});