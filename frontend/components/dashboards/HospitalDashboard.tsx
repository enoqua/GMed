import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

interface DashboardStats {
  hospital_name: string;
  departments: number;
  staff: number;
  beds: {
    total: number;
    occupied: number;
    available: number;
    occupancy_rate: number;
  };
  patients: {
    active_admissions: number;
    today_admissions: number;
  };
  revenue: {
    total: number;
  };
}

export default function HospitalDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/hospital/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching hospital stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  const quickActions = [
    {
      id: '1',
      title: 'Departments',
      icon: 'business',
      color: '#1976D2',
      route: '/hospital/departments',
    },
    {
      id: '2',
      title: 'Bed Management',
      icon: 'bed',
      color: '#7B1FA2',
      route: '/hospital/beds',
    },
    {
      id: '3',
      title: 'Admissions',
      icon: 'person-add',
      color: '#F57C00',
      route: '/hospital/admissions',
    },
    {
      id: '4',
      title: 'Services',
      icon: 'medical',
      color: '#0097A7',
      route: '/hospital/services',
    },
    {
      id: '5',
      title: 'Staff',
      icon: 'people',
      color: '#388E3C',
      route: '/hospital/staff',
    },
    {
      id: '6',
      title: 'Reports',
      icon: 'bar-chart',
      color: '#C2185B',
      route: '/hospital/reports',
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.hospitalName}>{stats?.hospital_name || 'Hospital'}</Text>
        <Text style={styles.subtitle}>Management Dashboard</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
          <Ionicons name="business" size={28} color="#1976D2" />
          <Text style={styles.statValue}>{stats?.departments || 0}</Text>
          <Text style={styles.statLabel}>Departments</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#F3E5F5' }]}>
          <Ionicons name="people" size={28} color="#7B1FA2" />
          <Text style={styles.statValue}>{stats?.staff || 0}</Text>
          <Text style={styles.statLabel}>Staff</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
          <Ionicons name="person" size={28} color="#388E3C" />
          <Text style={styles.statValue}>{stats?.patients.active_admissions || 0}</Text>
          <Text style={styles.statLabel}>Active Patients</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
          <Ionicons name="cash" size={28} color="#F57C00" />
          <Text style={styles.statValue}>GH₵ {((stats?.revenue.total || 0) / 1000).toFixed(1)}K</Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
      </View>

      <View style={styles.bedStatus}>
        <Text style={styles.sectionTitle}>Bed Occupancy</Text>
        <View style={styles.bedStatsRow}>
          <View style={styles.bedStatItem}>
            <Text style={styles.bedStatValue}>{stats?.beds.total || 0}</Text>
            <Text style={styles.bedStatLabel}>Total Beds</Text>
          </View>
          <View style={styles.bedStatItem}>
            <Text style={[styles.bedStatValue, { color: '#F44336' }]}>
              {stats?.beds.occupied || 0}
            </Text>
            <Text style={styles.bedStatLabel}>Occupied</Text>
          </View>
          <View style={styles.bedStatItem}>
            <Text style={[styles.bedStatValue, { color: '#4CAF50' }]}>
              {stats?.beds.available || 0}
            </Text>
            <Text style={styles.bedStatLabel}>Available</Text>
          </View>
          <View style={styles.bedStatItem}>
            <Text style={[styles.bedStatValue, { color: '#FF9800' }]}>
              {stats?.beds.occupancy_rate.toFixed(0) || 0}%
            </Text>
            <Text style={styles.bedStatLabel}>Occupancy</Text>
          </View>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${stats?.beds.occupancy_rate || 0}%` },
            ]}
          />
        </View>
      </View>

      <View style={styles.todayStats}>
        <View style={styles.todayCard}>
          <Ionicons name="today" size={24} color="#2196F3" />
          <View style={styles.todayInfo}>
            <Text style={styles.todayValue}>{stats?.patients.today_admissions || 0}</Text>
            <Text style={styles.todayLabel}>Today's Admissions</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.actionCard}
            onPress={() => router.push(action.route as any)}
          >
            <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
              <Ionicons name={action.icon as any} size={28} color={action.color} />
            </View>
            <Text style={styles.actionTitle}>{action.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 24,
  },
  hospitalName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  subtitle: {
    fontSize: 16,
    color: '#546E7A',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A237E',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#546E7A',
    marginTop: 4,
  },
  bedStatus: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 16,
  },
  bedStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  bedStatItem: {
    alignItems: 'center',
  },
  bedStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  bedStatLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1976D2',
    borderRadius: 4,
  },
  todayStats: {
    marginBottom: 24,
  },
  todayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  todayInfo: {
    flex: 1,
  },
  todayValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  todayLabel: {
    fontSize: 14,
    color: '#546E7A',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A237E',
    textAlign: 'center',
  },
});