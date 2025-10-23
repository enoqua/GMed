import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

interface DoctorStats {
  total_appointments: number;
  today_appointments: number;
  pending_appointments: number;
  total_patients: number;
  total_earnings: number;
  rating: number;
  total_reviews: number;
}

export default function DoctorDashboard({ userName }: { userName: string }) {
  const router = useRouter();
  const [stats, setStats] = useState<DoctorStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, Dr.</Text>
          <Text style={styles.userName}>{userName}</Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={28} color="#1A237E" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
          <Ionicons name="calendar" size={32} color="#2196F3" />
          <Text style={styles.statValue}>{stats?.today_appointments || 0}</Text>
          <Text style={styles.statLabel}>Today's Appointments</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
          <Ionicons name="time" size={32} color="#FF9800" />
          <Text style={styles.statValue}>{stats?.pending_appointments || 0}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
          <Ionicons name="people" size={32} color="#4CAF50" />
          <Text style={styles.statValue}>{stats?.total_patients || 0}</Text>
          <Text style={styles.statLabel}>Total Patients</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F3E5F5' }]}>
          <Ionicons name="cash" size={32} color="#9C27B0" />
          <Text style={styles.statValue}>GHS {stats?.total_earnings?.toFixed(2) || '0.00'}</Text>
          <Text style={styles.statLabel}>Total Earnings</Text>
        </View>
      </View>

      <View style={styles.ratingCard}>
        <View style={styles.ratingHeader}>
          <Ionicons name="star" size={32} color="#FFB300" />
          <View style={styles.ratingInfo}>
            <Text style={styles.ratingValue}>{stats?.rating?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.ratingReviews}>({stats?.total_reviews || 0} reviews)</Text>
          </View>
        </View>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/appointments')}
        >
          <Ionicons name="calendar" size={24} color="#4CAF50" />
          <Text style={styles.actionButtonText}>View Appointments</Text>
          <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="people" size={24} color="#2196F3" />
          <Text style={styles.actionButtonText}>Patient Records</Text>
          <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="document-text" size={24} color="#FF9800" />
          <Text style={styles.actionButtonText}>Prescriptions</Text>
          <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
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
    textAlign: 'center',
  },
  ratingCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ratingInfo: {
    flex: 1,
  },
  ratingValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  ratingReviews: {
    fontSize: 14,
    color: '#546E7A',
  },
  quickActions: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#263238',
  },
});