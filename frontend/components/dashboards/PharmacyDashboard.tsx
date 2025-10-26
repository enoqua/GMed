import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../services/api';

interface PharmacyStats {
  pharmacy_name: string;
  inventory_count: number;
  total_orders: number;
  total_sales: number;
  low_stock_items: number;
}

export default function PharmacyDashboard({ userName }: { userName: string }) {
  const router = useRouter();
  const [stats, setStats] = useState<PharmacyStats | null>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddMedicine, setShowAddMedicine] = useState(false);
  const [newMedicine, setNewMedicine] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
  });

  useEffect(() => {
    fetchStats();
    fetchInventory();
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

  const fetchInventory = async () => {
    try {
      const response = await api.get('/pharmacies/inventory');
      setInventory(response.data.inventory);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const handleAddMedicine = async () => {
    if (!newMedicine.name || !newMedicine.price || !newMedicine.stock) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      await api.post('/pharmacies/medicines', {
        name: newMedicine.name,
        description: newMedicine.description,
        price: parseFloat(newMedicine.price),
        stock: parseInt(newMedicine.stock),
        category: newMedicine.category || 'General',
      });
      Alert.alert('Success', 'Medicine added successfully');
      setShowAddMedicine(false);
      setNewMedicine({ name: '', description: '', price: '', stock: '', category: '' });
      fetchInventory();
      fetchStats();
    } catch (error) {
      Alert.alert('Error', 'Failed to add medicine');
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
    fetchInventory();
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome,</Text>
          <Text style={styles.userName}>{stats?.pharmacy_name || userName}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowAddMedicine(true)}>
          <Ionicons name="add-circle" size={32} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
          <Ionicons name="medkit" size={32} color="#4CAF50" />
          <Text style={styles.statValue}>{stats?.inventory_count || 0}</Text>
          <Text style={styles.statLabel}>Medicines</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
          <Ionicons name="cart" size={32} color="#2196F3" />
          <Text style={styles.statValue}>{stats?.total_orders || 0}</Text>
          <Text style={styles.statLabel}>Orders</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
          <Ionicons name="cash" size={32} color="#FF9800" />
          <Text style={styles.statValue}>GHS {stats?.total_sales || 0}</Text>
          <Text style={styles.statLabel}>Total Sales</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FFEBEE' }]}>
          <Ionicons name="warning" size={32} color="#F44336" />
          <Text style={styles.statValue}>{stats?.low_stock_items || 0}</Text>
          <Text style={styles.statLabel}>Low Stock</Text>
        </View>
      </View>

      <View style={styles.inventorySection}>
        <Text style={styles.sectionTitle}>Recent Inventory</Text>
        {inventory.slice(0, 5).map((item, index) => (
          <View key={index} style={styles.inventoryItem}>
            <View style={styles.medicineIcon}>
              <Ionicons name="medical" size={24} color="#4CAF50" />
            </View>
            <View style={styles.medicineInfo}>
              <Text style={styles.medicineName}>{item.name}</Text>
              <Text style={styles.medicineCategory}>{item.category}</Text>
            </View>
            <View style={styles.medicinePrice}>
              <Text style={styles.priceText}>GHS {item.price}</Text>
              <Text style={styles.stockText}>Stock: {item.stock}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/pharmacy/manage-products')}
          >
            <Ionicons name="medical" size={32} color="#4CAF50" />
            <Text style={styles.actionTitle}>Manage Products</Text>
            <Text style={styles.actionSubtitle}>Add, edit or remove products</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/orders')}
          >
            <Ionicons name="cart" size={32} color="#2196F3" />
            <Text style={styles.actionTitle}>View Orders</Text>
            <Text style={styles.actionSubtitle}>Manage customer orders</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showAddMedicine} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Medicine</Text>
              <TouchableOpacity onPress={() => setShowAddMedicine(false)}>
                <Ionicons name="close" size={24} color="#1A237E" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <TextInput
                style={styles.input}
                placeholder="Medicine Name *"
                value={newMedicine.name}
                onChangeText={(text) => setNewMedicine({ ...newMedicine, name: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Description"
                value={newMedicine.description}
                onChangeText={(text) => setNewMedicine({ ...newMedicine, description: text })}
                multiline
              />
              <TextInput
                style={styles.input}
                placeholder="Price (GHS) *"
                value={newMedicine.price}
                onChangeText={(text) => setNewMedicine({ ...newMedicine, price: text })}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Stock Quantity *"
                value={newMedicine.stock}
                onChangeText={(text) => setNewMedicine({ ...newMedicine, stock: text })}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Category"
                value={newMedicine.category}
                onChangeText={(text) => setNewMedicine({ ...newMedicine, category: text })}
              />

              <TouchableOpacity style={styles.addButton} onPress={handleAddMedicine}>
                <Text style={styles.addButtonText}>Add Medicine</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  },
  inventorySection: {
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
  inventoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  medicineIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  medicineCategory: {
    fontSize: 12,
    color: '#546E7A',
    marginTop: 2,
  },
  medicinePrice: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  stockText: {
    fontSize: 12,
    color: '#546E7A',
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});