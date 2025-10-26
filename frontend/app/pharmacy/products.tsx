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
  Image,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

interface Product {
  id: string;
  pharmacy_id: string;
  pharmacy_name: string;
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

export default function PharmacyProductsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const pharmacyId = params.pharmacy_id as string;
  const pharmacyName = params.pharmacy_name as string;

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'medicine', 'supplements', 'medical supplies', 'personal care'];

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchQuery, selectedCategory, products]);

  const fetchProducts = async () => {
    try {
      const response = await api.get(`/products?pharmacy_id=${pharmacyId}`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category.toLowerCase() === selectedCategory);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const handleAddToCart = async (product: Product) => {
    try {
      await api.post('/cart/add', {
        product_id: product.id,
        quantity: 1,
      });
      Alert.alert('Success', `${product.name} added to cart`);
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add to cart');
    }
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => router.push({
        pathname: '/pharmacy/product-details',
        params: { product_id: item.id }
      })}
    >
      {item.image_base64 ? (
        <Image
          source={{ uri: `data:image/jpeg;base64,${item.image_base64}` }}
          style={styles.productImage}
        />
      ) : (
        <View style={styles.productImagePlaceholder}>
          <Ionicons name="medical" size={40} color="#BDBDBD" />
        </View>
      )}

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        {item.manufacturer && (
          <Text style={styles.manufacturer}>{item.manufacturer}</Text>
        )}
        <Text style={styles.productDescription} numberOfLines={2}>{item.description}</Text>
        
        <View style={styles.productFooter}>
          <View>
            <Text style={styles.price}>GH₵ {item.price.toFixed(2)}</Text>
            {!item.in_stock && <Text style={styles.outOfStock}>Out of Stock</Text>}
            {item.requires_prescription && (
              <View style={styles.prescriptionBadge}>
                <Ionicons name="document-text" size={12} color="#FF6B6B" />
                <Text style={styles.prescriptionText}>Rx Required</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={[styles.addButton, !item.in_stock && styles.addButtonDisabled]}
            onPress={(e) => {
              e.stopPropagation();
              if (item.in_stock) handleAddToCart(item);
            }}
            disabled={!item.in_stock}
          >
            <Ionicons name="cart" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A237E" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{pharmacyName}</Text>
          <Text style={styles.headerSubtitle}>Products</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/cart')} style={styles.cartButton}>
          <Ionicons name="cart" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#757575" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          data={categories}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === item && styles.categoryChipActive
              ]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory === item && styles.categoryTextActive
              ]}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color="#BDBDBD" />
          <Text style={styles.emptyText}>
            {searchQuery ? 'No products found' : 'No products available'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  backButton: { padding: 4 },
  headerInfo: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A237E' },
  headerSubtitle: { fontSize: 14, color: '#757575' },
  cartButton: { padding: 4 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', margin: 16, backgroundColor: '#FFFFFF', borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E0E0E0' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 16, color: '#263238' },
  categoriesContainer: { paddingHorizontal: 16, marginBottom: 12 },
  categoryChip: { backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: '#E0E0E0' },
  categoryChipActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  categoryText: { fontSize: 14, color: '#546E7A', fontWeight: '500' },
  categoryTextActive: { color: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 16, color: '#757575', marginTop: 16, textAlign: 'center' },
  listContent: { padding: 16 },
  row: { justifyContent: 'space-between' },
  productCard: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  productImage: { width: '100%', height: 120, resizeMode: 'cover' },
  productImagePlaceholder: { width: '100%', height: 120, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  productInfo: { padding: 12 },
  productName: { fontSize: 14, fontWeight: 'bold', color: '#1A237E', marginBottom: 4 },
  manufacturer: { fontSize: 11, color: '#757575', marginBottom: 4 },
  productDescription: { fontSize: 12, color: '#546E7A', marginBottom: 8, lineHeight: 16 },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  price: { fontSize: 16, fontWeight: 'bold', color: '#4CAF50' },
  outOfStock: { fontSize: 11, color: '#F44336', marginTop: 2 },
  prescriptionBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  prescriptionText: { fontSize: 10, color: '#FF6B6B' },
  addButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center' },
  addButtonDisabled: { backgroundColor: '#BDBDBD' },
});