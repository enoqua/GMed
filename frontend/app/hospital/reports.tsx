import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ReportsScreen() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');

  const reportCategories = [
    { id: 1, title: 'Financial Reports', icon: 'cash', color: '#4CAF50', count: 5 },
    { id: 2, title: 'Patient Statistics', icon: 'people', color: '#2196F3', count: 8 },
    { id: 3, title: 'Department Performance', icon: 'stats-chart', color: '#FF9800', count: 12 },
    { id: 4, title: 'Inventory Reports', icon: 'cube', color: '#9C27B0', count: 6 },
    { id: 5, title: 'Staff Reports', icon: 'person', color: '#F44336', count: 10 },
    { id: 6, title: 'Quality Metrics', icon: 'star', color: '#00BCD4', count: 7 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A237E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports & Analytics</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons name="settings" size={24} color="#1976D2" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'week' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('week')}
          >
            <Text style={[styles.periodText, selectedPeriod === 'week' && styles.periodTextActive]}>Week</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'month' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('month')}
          >
            <Text style={[styles.periodText, selectedPeriod === 'month' && styles.periodTextActive]}>Month</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'year' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('year')}
          >
            <Text style={[styles.periodText, selectedPeriod === 'year' && styles.periodTextActive]}>Year</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.categoriesGrid}>
          {reportCategories.map((category) => (
            <TouchableOpacity key={category.id} style={styles.categoryCard}>
              <View style={[styles.categoryIcon, { backgroundColor: `${category.color}20` }]}>
                <Ionicons name={category.icon as any} size={32} color={category.color} />
              </View>
              <Text style={styles.categoryTitle}>{category.title}</Text>
              <Text style={styles.categoryCount}>{category.count} reports</Text>
              <View style={styles.viewButton}>
                <Text style={styles.viewButtonText}>View</Text>
                <Ionicons name="arrow-forward" size={16} color="#1976D2" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.quickStats}>
          <Text style={styles.sectionTitle}>Quick Statistics</Text>
          <View style={styles.statCard}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Revenue This Month</Text>
              <Text style={styles.statValue}>GH₵ 45,230</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Patients</Text>
              <Text style={styles.statValue}>1,234</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Occupancy Rate</Text>
              <Text style={[styles.statValue, { color: '#4CAF50' }]}>87%</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9FF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A237E' },
  settingsButton: { padding: 4 },
  content: { flex: 1 },
  periodSelector: { flexDirection: 'row', margin: 16, gap: 8 },
  periodButton: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center' },
  periodButtonActive: { backgroundColor: '#1976D2', borderColor: '#1976D2' },
  periodText: { fontSize: 14, color: '#546E7A', fontWeight: '600' },
  periodTextActive: { color: '#FFFFFF' },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
  categoryCard: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  categoryIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  categoryTitle: { fontSize: 14, fontWeight: '600', color: '#1A237E', textAlign: 'center', marginBottom: 6 },
  categoryCount: { fontSize: 12, color: '#757575', marginBottom: 12 },
  viewButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewButtonText: { fontSize: 14, color: '#1976D2', fontWeight: '600' },
  quickStats: { margin: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A237E', marginBottom: 12 },
  statCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  statLabel: { fontSize: 14, color: '#546E7A' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#1976D2' },
});