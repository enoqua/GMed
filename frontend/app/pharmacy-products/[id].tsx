import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

interface ProductDetail {
  id: string;
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

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, []);

  const fetchProduct = async () => {
    try {
      const response = await api.get(`/products/${id}`);
      setProduct(response.data);
    } catch (error) {
      console.error('Error fetching product:', error);
      Alert.alert('Error', 'Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    if (!product.in_stock) {
      Alert.alert('Out of Stock', 'This product is currently unavailable');
      return;
    }

    setAdding(true);
    try {
      await api.post('/cart/add', {
        product_id: product.id,
        quantity: quantity,
      });
      Alert.alert('Success', 'Product added to cart', [
        { text: 'Continue Shopping', style: 'cancel' },
        { text: 'View Cart', onPress: () => router.push('/cart') },
      ]);
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to add product to cart';
      Alert.alert('Error', message);
    } finally {
      setAdding(false);
    }
  };

  const incrementQuantity = () => {
    if (product && quantity < product.stock_quantity) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF9800" />
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle" size={64} color="#BDBDBD" />
          <Text style={styles.emptyText}>Product not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A237E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <TouchableOpacity onPress={() => router.push('/cart')}>
          <Ionicons name="cart" size={24} color="#1A237E" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.productImageContainer}>
          <Ionicons name="medical" size={80} color="#FF9800" />
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.pharmacy}>{product.pharmacy_name}</Text>

          <View style={styles.badgesRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{product.category}</Text>
            </View>
            {product.requires_prescription && (
              <View style={styles.prescriptionBadge}>
                <Ionicons name="document-text" size={14} color="#F44336" />
                <Text style={styles.prescriptionText}>Prescription Required</Text>
              </View>
            )}
          </View>

          <Text style={styles.price}>GH₵ {product.price.toFixed(2)}</Text>

          {product.manufacturer && (
            <View style={styles.infoRow}>
              <Ionicons name="business" size={16} color="#757575" />
              <Text style={styles.infoText}>Manufacturer: {product.manufacturer}</Text>
            </View>
          )}

          {product.dosage_form && (
            <View style={styles.infoRow}>
              <Ionicons name="flask" size={16} color="#757575" />
              <Text style={styles.infoText}>Form: {product.dosage_form}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Ionicons name="cube" size={16} color="#757575" />
            <Text style={styles.infoText}>
              Stock: {product.stock_quantity} units available
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{product.description}</Text>

          {product.in_stock ? (
            <View>
              <Text style={styles.sectionTitle}>Quantity</Text>
              <View style={styles.quantitySelector}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={decrementQuantity}
                  disabled={quantity <= 1}
                >
                  <Ionicons
                    name="remove"
                    size={24}
                    color={quantity <= 1 ? '#BDBDBD' : '#1A237E'}
                  />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={incrementQuantity}
                  disabled={quantity >= product.stock_quantity}
                >
                  <Ionicons
                    name="add"
                    size={24}
                    color={quantity >= product.stock_quantity ? '#BDBDBD' : '#1A237E'}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.outOfStockBanner}>
              <Ionicons name="close-circle" size={24} color="#F44336" />
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {product.in_stock && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.addToCartButton, adding && styles.addToCartButtonDisabled]}
            onPress={handleAddToCart}
            disabled={adding}
          >
            {adding ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="cart" size={20} color="#FFFFFF" />
                <Text style={styles.addToCartText}>
                  Add to Cart - GH₵ {(product.price * quantity).toFixed(2)}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
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
    paddingBottom: 100,
  },
  productImageContainer: {
    backgroundColor: '#FFF3E0',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: -24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 8,
  },
  pharmacy: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 16,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  categoryBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '600',
  },
  prescriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  prescriptionText: {
    fontSize: 12,
    color: '#F44336',
    fontWeight: '600',
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#757575',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
    marginTop: 16,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#546E7A',
    lineHeight: 22,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginTop: 8,
  },
  quantityButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  quantityText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  outOfStockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  outOfStockText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F44336',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF9800',
    paddingVertical: 16,
    borderRadius: 12,
  },
  addToCartButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  addToCartText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#1A237E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});