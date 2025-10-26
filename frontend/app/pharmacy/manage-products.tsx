import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import api from '../../services/api';
import * as ImagePicker from 'expo-image-picker';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  requires_prescription: boolean;
  stock_quantity: number;
  image_base64?: string;
  manufacturer?: string;
  dosage_form?: string;
  in_stock: boolean;
}

export default function ManageProductsScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'medicine',
    requires_prescription: false,
    stock_quantity: '',
    manufacturer: '',
    dosage_form: '',
    image_base64: '',
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const openCreateModal = () => {
    setEditMode(false);
    setSelectedProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      category: 'medicine',
      requires_prescription: false,
      stock_quantity: '',
      manufacturer: '',
      dosage_form: '',
      image_base64: '',
    });
    setModalVisible(true);
  };

  const openEditModal = (product: Product) => {
    setEditMode(true);
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      category: product.category,
      requires_prescription: product.requires_prescription,
      stock_quantity: product.stock_quantity.toString(),
      manufacturer: product.manufacturer || '',
      dosage_form: product.dosage_form || '',
      image_base64: product.image_base64 || '',
    });
    setModalVisible(true);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permission');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setFormData({ ...formData, image_base64: result.assets[0].base64 });
    }
  };

  const handleSaveProduct = async () => {
    if (!formData.name || !formData.description || !formData.price || !formData.stock_quantity) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        requires_prescription: formData.requires_prescription,
        stock_quantity: parseInt(formData.stock_quantity),
        manufacturer: formData.manufacturer || 'Generic',
        dosage_form: formData.dosage_form || 'Not specified',
        image_base64: formData.image_base64 || null,
      };

      if (editMode && selectedProduct) {
        await api.put(`/products/${selectedProduct.id}`, payload);
        Alert.alert('Success', 'Product updated successfully');
      } else {
        await api.post('/products', payload);
        Alert.alert('Success', 'Product created successfully');
      }

      setModalVisible(false);
      fetchProducts();
    } catch (error: any) {
      console.error('Error saving product:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = (product: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/products/${product.id}`);
              Alert.alert('Success', 'Product deleted successfully');
              fetchProducts();
            } catch (error: any) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <View style={styles.productHeader}>
        {item.image_base64 ? (
          <Image
            source={{ uri: `data:image/jpeg;base64,${item.image_base64}` }}
            style={styles.productImage}
          />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Ionicons name="medical" size={24} color="#BDBDBD" />
          </View>
        )}

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.productPrice}>GH₵ {item.price.toFixed(2)}</Text>
          <View style={styles.stockRow}>
            <Ionicons
              name={item.in_stock ? "checkmark-circle" : "close-circle"}
              size={16}
              color={item.in_stock ? "#4CAF50" : "#F44336"}
            />
            <Text style={[styles.stockText, !item.in_stock && styles.outOfStock]}>
              {item.in_stock ? `${item.stock_quantity} in stock` : 'Out of stock'}
            </Text>
          </View>
        </View>

        <View style={styles.productActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openEditModal(item)}
          >
            <Ionicons name="create" size={20} color="#1976D2" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteProduct(item)}
          >
            <Ionicons name="trash" size={20} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.productDetails}>
        <View style={styles.detailChip}>
          <Text style={styles.chipText}>{item.category}</Text>
        </View>
        {item.requires_prescription && (
          <View style={[styles.detailChip, styles.prescriptionChip]}>
            <Ionicons name="document-text" size={12} color="#F44336" />
            <Text style={[styles.chipText, styles.prescriptionText]}>Rx</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A237E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Products</Text>
        <TouchableOpacity onPress={openCreateModal} style={styles.addButton}>
          <Ionicons name="add-circle" size={28} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="medical-outline" size={64} color="#BDBDBD" />
          <Text style={styles.emptyText}>No products yet</Text>
          <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
            <Text style={styles.createButtonText}>Add First Product</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      )}

      {/* Create/Edit Product Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editMode ? 'Edit Product' : 'Add New Product'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#546E7A" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
                {formData.image_base64 ? (
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${formData.image_base64}` }}
                    style={styles.imagePreview}
                  />
                ) : (
                  <>
                    <Ionicons name="camera" size={32} color="#757575" />
                    <Text style={styles.imagePickerText}>Tap to add image</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Product Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Paracetamol 500mg"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />

              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Product description"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>Price (GH₵) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 15.00"
                value={formData.price}
                onChangeText={(text) => setFormData({ ...formData, price: text })}
                keyboardType="decimal-pad"
              />

              <Text style={styles.inputLabel}>Stock Quantity *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 100"
                value={formData.stock_quantity}
                onChangeText={(text) => setFormData({ ...formData, stock_quantity: text })}
                keyboardType="number-pad"
              />

              <Text style={styles.inputLabel}>Category *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <Picker.Item label="Medicine" value="medicine" />
                  <Picker.Item label="Supplements" value="supplements" />
                  <Picker.Item label="Medical Supplies" value="medical supplies" />
                  <Picker.Item label="Personal Care" value="personal care" />
                </Picker>
              </View>

              <Text style={styles.inputLabel}>Manufacturer</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., GSK"
                value={formData.manufacturer}
                onChangeText={(text) => setFormData({ ...formData, manufacturer: text })}
              />

              <Text style={styles.inputLabel}>Dosage Form</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Tablets, Syrup"
                value={formData.dosage_form}
                onChangeText={(text) => setFormData({ ...formData, dosage_form: text })}
              />

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setFormData({ ...formData, requires_prescription: !formData.requires_prescription })}
              >
                <Ionicons
                  name={formData.requires_prescription ? "checkbox" : "square-outline"}
                  size={24}
                  color="#4CAF50"
                />
                <Text style={styles.checkboxLabel}>Requires Prescription</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, saving && styles.submitButtonDisabled]}
                onPress={handleSaveProduct}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {editMode ? 'Update Product' : 'Add Product'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A237E' },
  addButton: { padding: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 16, color: '#757575', marginTop: 16, marginBottom: 24 },
  createButton: { backgroundColor: '#4CAF50', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  createButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  listContent: { padding: 16 },
  productCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  productHeader: { flexDirection: 'row', marginBottom: 12 },
  productImage: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
  productImagePlaceholder: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  productInfo: { flex: 1 },
  productName: { fontSize: 16, fontWeight: 'bold', color: '#1A237E', marginBottom: 4 },
  productPrice: { fontSize: 18, fontWeight: 'bold', color: '#4CAF50', marginBottom: 4 },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stockText: { fontSize: 13, color: '#4CAF50' },
  outOfStock: { color: '#F44336' },
  productActions: { flexDirection: 'row', gap: 8 },
  actionButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  productDetails: { flexDirection: 'row', gap: 8 },
  detailChip: { backgroundColor: '#E3F2FD', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  chipText: { fontSize: 11, color: '#1976D2', fontWeight: '500' },
  prescriptionChip: { backgroundColor: '#FFEBEE', flexDirection: 'row', alignItems: 'center', gap: 4 },
  prescriptionText: { color: '#F44336' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A237E' },
  modalForm: { padding: 20 },
  imagePickerButton: { width: '100%', height: 150, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', marginBottom: 16, overflow: 'hidden' },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePickerText: { fontSize: 14, color: '#757575', marginTop: 8 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#1A237E', marginBottom: 8, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, fontSize: 16, color: '#263238', backgroundColor: '#FFFFFF' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  pickerContainer: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, backgroundColor: '#FFFFFF' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  checkboxLabel: { fontSize: 16, color: '#1A237E' },
  submitButton: { backgroundColor: '#4CAF50', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 24, marginBottom: 20 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
