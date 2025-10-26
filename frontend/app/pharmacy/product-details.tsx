import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  TextInput,
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

export default function ProductDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const productId = params.product_id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    fetchProductDetails();
  }, []);

  const fetchProductDetails = async () => {
    try {
      const response = await api.get(`/products/${productId}`);
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

    try {
      setAddingToCart(true);
      await api.post('/cart/add', {
        product_id: product.id,
        quantity: quantity,
      });
      Alert.alert(
        'Success',
        `${product.name} (x${quantity}) added to cart`,
        [
          { text: 'Continue Shopping', style: 'cancel' },
          { text: 'Go to Cart', onPress: () => router.push('/cart') },
        ]
      );
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
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
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#F44336" />
          <Text style={styles.errorText}>Product not found</Text>
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
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#1A237E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <TouchableOpacity onPress={() => router.push('/cart')} style={styles.headerButton}>
          <Ionicons name="cart" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {product.image_base64 ? (
          <Image
            source={{ uri: `data:image/jpeg;base64,${product.image_base64}` }}
            style={styles.productImage}
          />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Ionicons name="medical" size={80} color="#BDBDBD" />
          </View>
        )}

        <View style={styles.infoContainer}>
          <View style={styles.pharmacyBadge}>
            <Ionicons name="storefront" size={14} color="#1976D2" />
            <Text style={styles.pharmacyName}>{product.pharmacy_name}</Text>
          </View>

          <Text style={styles.productName}>{product.name}</Text>

          {product.manufacturer && (
            <View style={styles.detailRow}>
              <Ionicons name="business" size={16} color="#757575" />
              <Text style={styles.detailText}>by {product.manufacturer}</Text>
            </View>
          )}

          <View style={styles.priceRow}>
            <Text style={styles.price}>GH₵ {product.price.toFixed(2)}</Text>
            {product.in_stock ? (
              <View style={styles.stockBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.stockText}>{product.stock_quantity} in stock</Text>
              </View>
            ) : (
              <View style={[styles.stockBadge, styles.outOfStockBadge]}>
                <Ionicons name="close-circle" size={16} color="#F44336" />
                <Text style={[styles.stockText, styles.outOfStockText]}>Out of Stock</Text>
              </View>
            )}
          </View>

          {product.requires_prescription && (
            <View style={styles.prescriptionWarning}>
              <Ionicons name="warning" size={20} color="#FF9800" />
              <Text style={styles.prescriptionText}>
                Prescription Required - Please upload prescription during checkout
              </Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>

          {product.dosage_form && (
            <View style={styles.detailsGrid}>
              <View style={styles.detailCard}>
                <Ionicons name="flask" size={20} color="#1976D2" />
                <Text style={styles.detailLabel}>Form</Text>
                <Text style={styles.detailValue}>{product.dosage_form}</Text>
              </View>
              <View style={styles.detailCard}>
                <Ionicons name="pricetag" size={20} color="#4CAF50" />
                <Text style={styles.detailLabel}>Category</Text>
                <Text style={styles.detailValue}>{product.category}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {product.in_stock && (
        <View style={styles.footer}>
          <View style={styles.quantityContainer}>
            <Text style={styles.quantityLabel}>Quantity:</Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity style={styles.quantityButton} onPress={decrementQuantity}>
                <Ionicons name="remove" size={20} color="#1A237E" />
              </TouchableOpacity>
              <Text style={styles.quantityValue}>{quantity}</Text>
              <TouchableOpacity style={styles.quantityButton} onPress={incrementQuantity}>
                <Ionicons name="add" size={20} color="#1A237E" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.addToCartButton, addingToCart && styles.addToCartButtonDisabled]}
            onPress={handleAddToCart}
            disabled={addingToCart}
          >
            {addingToCart ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="cart" size={20} color="#FFFFFF" />
                <Text style={styles.addToCartText}>Add to Cart</Text>
                <Text style={styles.totalPrice}>GH₵ {(product.price * quantity).toFixed(2)}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  headerButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A237E' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  errorText: { fontSize: 18, color: '#757575', marginTop: 16, marginBottom: 24 },
  backButton: { backgroundColor: '#1976D2', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  backButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  content: { flex: 1 },
  productImage: { width: '100%', height: 300, resizeMode: 'contain', backgroundColor: '#FFFFFF' },
  productImagePlaceholder: { width: '100%', height: 300, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  infoContainer: { backgroundColor: '#FFFFFF', padding: 16, marginTop: 8 },
  pharmacyBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  pharmacyName: { fontSize: 14, color: '#1976D2', fontWeight: '500' },
  productName: { fontSize: 22, fontWeight: 'bold', color: '#1A237E', marginBottom: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  detailText: { fontSize: 14, color: '#757575' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  price: { fontSize: 28, fontWeight: 'bold', color: '#4CAF50' },
  stockBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  stockText: { fontSize: 13, color: '#4CAF50', fontWeight: '500' },
  outOfStockBadge: { backgroundColor: '#FFEBEE' },
  outOfStockText: { color: '#F44336' },
  prescriptionWarning: { flexDirection: 'row', gap: 12, backgroundColor: '#FFF3E0', padding: 12, borderRadius: 8, marginBottom: 16 },
  prescriptionText: { flex: 1, fontSize: 13, color: '#F57C00', lineHeight: 18 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A237E', marginBottom: 8 },
  description: { fontSize: 14, color: '#546E7A', lineHeight: 22 },
  detailsGrid: { flexDirection: 'row', gap: 12, marginTop: 16 },
  detailCard: { flex: 1, backgroundColor: '#F5F9FF', padding: 16, borderRadius: 12, alignItems: 'center' },
  detailLabel: { fontSize: 12, color: '#757575', marginTop: 8 },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#1A237E', marginTop: 4 },
  footer: { backgroundColor: '#FFFFFF', padding: 16, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  quantityContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  quantityLabel: { fontSize: 16, fontWeight: '600', color: '#1A237E' },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  quantityButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' },
  quantityValue: { fontSize: 18, fontWeight: 'bold', color: '#1A237E', minWidth: 30, textAlign: 'center' },
  addToCartButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4CAF50', paddingVertical: 14, borderRadius: 8, gap: 8 },
  addToCartButtonDisabled: { opacity: 0.6 },
  addToCartText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  totalPrice: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginLeft: 'auto' },
});