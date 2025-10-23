import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { format } from 'date-fns';

export default function PaymentsScreen() {
  const router = useRouter();
  const [payments, setPayments] = useState([]);
  const [methods, setMethods] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [paymentsRes, methodsRes] = await Promise.all([
        api.get('/payments/history'),
        api.get('/payments/methods')
      ]);
      setPayments(paymentsRes.data);
      setMethods(methodsRes.data);
    } catch (error) {
      console.error('Error fetching payment data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'mtn_momo':
        return 'phone-portrait';
      case 'vodafone_cash':
        return 'phone-portrait';
      case 'airteltigo':
        return 'phone-portrait';
      default:
        return 'card';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'failed':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A237E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payments</Text>
        <TouchableOpacity onPress={() => router.push('/payments/add-method' as any)}>
          <Ionicons name="add-circle" size={28} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <FlatList
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} />}
        ListHeaderComponent={
          <View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Methods</Text>
              {methods.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="card-outline" size={48} color="#BDBDBD" />
                  <Text style={styles.emptyText}>No payment methods added</Text>
                  <TouchableOpacity
                    style={styles.addMethodButton}
                    onPress={() => router.push('/payments/add-method' as any)}
                  >
                    <Text style={styles.addMethodText}>Add Payment Method</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                methods.map((method: any) => (
                  <View key={method.id} style={styles.methodCard}>
                    <View style={styles.methodIcon}>
                      <Ionicons name={getMethodIcon(method.method_type) as any} size={24} color="#4CAF50" />
                    </View>
                    <View style={styles.methodInfo}>
                      <Text style={styles.methodName}>{method.account_name}</Text>
                      <Text style={styles.methodDetails}>{method.phone_number}</Text>
                      <Text style={styles.methodType}>{method.method_type.replace('_', ' ').toUpperCase()}</Text>
                    </View>
                    {method.is_default && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultText}>Default</Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Transaction History</Text>
            </View>
          </View>
        }
        data={payments}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }: any) => (
          <View style={styles.paymentCard}>
            <View style={styles.paymentHeader}>
              <View style={styles.paymentIcon}>
                <Ionicons name="cash" size={20} color="#4CAF50" />
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentPurpose}>{item.purpose}</Text>
                <Text style={styles.paymentDate}>
                  {format(new Date(item.created_at), 'MMM dd, yyyy hh:mm a')}
                </Text>
              </View>
            </View>
            <View style={styles.paymentFooter}>
              <Text style={styles.paymentAmount}>GHS {item.amount.toFixed(2)}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                  {item.status}
                </Text>
              </View>
            </View>
            <Text style={styles.transactionId}>TXN: {item.transaction_id}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={48} color="#BDBDBD" />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        }
      />
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
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 12,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  methodDetails: {
    fontSize: 14,
    color: '#546E7A',
    marginTop: 2,
  },
  methodType: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
  },
  defaultBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentPurpose: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  paymentDate: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  transactionId: {
    fontSize: 11,
    color: '#9E9E9E',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 16,
    marginBottom: 24,
  },
  addMethodButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addMethodText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});