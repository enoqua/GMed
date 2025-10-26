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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
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

type SortOption = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'newest';

export default function BrowseProductsScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [showSortModal, setShowSortModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const categories = [
    { label: 'All Products', value: 'all' },
    { label: 'Medicine', value: 'medicine' },
    { label: 'Supplements', value: 'supplements' },
    { label: 'Medical Supplies', value: 'medical supplies' },
    { label: 'Personal Care', value: 'personal care' },
  ];

  const sortOptions = [
    { label: 'Name (A-Z)', value: 'name-asc' as SortOption },
    { label: 'Name (Z-A)', value: 'name-desc' as SortOption },
    { label: 'Price (Low to High)', value: 'price-asc' as SortOption },
    { label: 'Price (High to Low)', value: 'price-desc' as SortOption },
  ];

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterAndSortProducts();
  }, [searchQuery, selectedCategory, sortBy, products]);

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

  const filterAndSortProducts = () => {
    let filtered = [...products];

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category.toLowerCase() === selectedCategory);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.pharmacy_name.toLowerCase().includes(query) ||
        (p.manufacturer && p.manufacturer.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        default:
          return 0;
      }
    });

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

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSortBy('name-asc');
    setShowFilters(false);
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
        <View style={styles.pharmacyBadge}>
          <Ionicons name="storefront" size={12} color="#1976D2" />
          <Text style={styles.pharmacyName} numberOfLines={1}>{item.pharmacy_name}</Text>
        </View>

        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        {item.manufacturer && (
          <Text style={styles.manufacturer} numberOfLines={1}>{item.manufacturer}</Text>
        )}

        <View style={styles.productFooter}>
          <View>
            <Text style={styles.price}>GH₵ {item.price.toFixed(2)}</Text>
            {!item.in_stock && <Text style={styles.outOfStock}>Out of Stock</Text>}
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

        {item.requires_prescription && (
          <View style={styles.prescriptionBadge}>
            <Ionicons name="document-text" size={12} color="#FF6B6B" />
            <Text style={styles.prescriptionText}>Prescription Required</Text>
          </View>
        )}
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
          <Text style={styles.headerTitle}>Browse Products</Text>
          <Text style={styles.headerSubtitle}>{filteredProducts.length} products</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/cart')} style={styles.cartButton}>
          <Ionicons name="cart" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#757575" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products, pharmacies, manufacturers..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#757575" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filtersBar}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="filter" size={18} color="#1976D2" />
          <Text style={styles.filterButtonText}>Category</Text>
          {selectedCategory !== 'all' && <View style={styles.filterDot} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowSortModal(true)}
        >
          <Ionicons name="swap-vertical" size={18} color="#1976D2" />
          <Text style={styles.filterButtonText}>Sort</Text>
        </TouchableOpacity>

        {(selectedCategory !== 'all' || searchQuery) && (
          <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color="#BDBDBD" />
          <Text style={styles.emptyText}>No products found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? 'Try different search terms' : 'No products available'}
          </Text>
          {(selectedCategory !== 'all' || searchQuery) && (
            <TouchableOpacity style={styles.resetButtonLarge} onPress={resetFilters}>
              <Text style={styles.resetButtonLargeText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
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

      {/* Category Filter Modal */}
      <Modal visible={showFilters} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Category</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color="#546E7A" />
              </TouchableOpacity>
            </View>

            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.optionItem,
                  selectedCategory === cat.value && styles.optionItemActive
                ]}
                onPress={() => {
                  setSelectedCategory(cat.value);
                  setShowFilters(false);
                }}
              >
                <Text style={[
                  styles.optionText,
                  selectedCategory === cat.value && styles.optionTextActive
                ]}>
                  {cat.label}
                </Text>
                {selectedCategory === cat.value && (
                  <Ionicons name="checkmark" size={24} color="#4CAF50" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Sort Modal */}
      <Modal visible={showSortModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort By</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Ionicons name="close" size={24} color="#546E7A" />
              </TouchableOpacity>
            </View>

            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionItem,
                  sortBy === option.value && styles.optionItemActive
                ]}
                onPress={() => {
                  setSortBy(option.value);
                  setShowSortModal(false);
                }}
              >
                <Text style={[
                  styles.optionText,
                  sortBy === option.value && styles.optionTextActive
                ]}>
                  {option.label}
                </Text>
                {sortBy === option.value && (
                  <Ionicons name="checkmark" size={24} color="#4CAF50" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  backButton: { padding: 4 },
  headerInfo: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A237E' },
  headerSubtitle: { fontSize: 13, color: '#757575', marginTop: 2 },
  cartButton: { padding: 4 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', margin: 16, backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E0E0E0' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#263238' },
  clearButton: { padding: 4 },
  filtersBar: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 8, alignItems: 'center' },
  filterButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, gap: 6, borderWidth: 1, borderColor: '#E0E0E0' },
  filterButtonText: { fontSize: 14, color: '#1976D2', fontWeight: '500' },
  filterDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4CAF50' },
  resetButton: { marginLeft: 'auto', backgroundColor: '#FFEBEE', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20 },
  resetButtonText: { fontSize: 13, color: '#F44336', fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#1A237E', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#757575', marginTop: 8, textAlign: 'center' },
  resetButtonLarge: { backgroundColor: '#4CAF50', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 24 },
  resetButtonLargeText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  listContent: { padding: 16 },
  row: { justifyContent: 'space-between' },
  productCard: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  productImage: { width: '100%', height: 130, resizeMode: 'cover' },
  productImagePlaceholder: { width: '100%', height: 130, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  productInfo: { padding: 12 },
  pharmacyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6, backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start' },
  pharmacyName: { fontSize: 10, color: '#1976D2', fontWeight: '600' },
  productName: { fontSize: 14, fontWeight: 'bold', color: '#1A237E', marginBottom: 4, minHeight: 36 },
  manufacturer: { fontSize: 11, color: '#757575', marginBottom: 6 },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  price: { fontSize: 16, fontWeight: 'bold', color: '#4CAF50' },
  outOfStock: { fontSize: 11, color: '#F44336', marginTop: 2 },
  addButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center' },
  addButtonDisabled: { backgroundColor: '#BDBDBD' },
  prescriptionBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  prescriptionText: { fontSize: 10, color: '#FF6B6B' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A237E' },
  optionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  optionItemActive: { backgroundColor: '#E8F5E9' },
  optionText: { fontSize: 16, color: '#263238' },
  optionTextActive: { fontWeight: '600', color: '#4CAF50' },
});
