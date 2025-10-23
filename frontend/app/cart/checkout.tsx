import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const PAYMENT_METHODS = [
  { id: 'mtn', name: 'MTN Mobile Money', icon: 'phone-portrait' },
  { id: 'vodafone', name: 'Vodafone Cash', icon: 'phone-portrait' },
  { id: 'airteltigo', name: 'AirtelTigo Money', icon: 'phone-portrait' },
];

export default function CheckoutScreen() {
  const router = useRouter();
  const { requiresPrescription } = useLocalSearchParams();
  
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mtn');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePlaceOrder = async () => {
    if (!deliveryAddress.trim()) {
      Alert.alert('Missing Information', 'Please enter delivery address');
      return;
    }
    if (!deliveryCity.trim()) {
      Alert.alert('Missing Information', 'Please enter delivery city');
      return;
    }
    if (!deliveryPhone.trim()) {
      Alert.alert('Missing Information', 'Please enter delivery phone');
      return;
    }
    if (!paymentPhone.trim()) {
      Alert.alert('Missing Information', 'Please enter payment phone number');
      return;
    }

    setLoading(true);
    try {
      // Get cart items first
      const cartResponse = await api.get('/cart');
      const cart = cartResponse.data;

      if (cart.items.length === 0) {
        Alert.alert('Empty Cart', 'Your cart is empty');
        return;
      }

      // Get pharmacy_id from first item
      const pharmacyId = cart.items[0].product_id; // Will be replaced with actual pharmacy_id

      const orderData = {
        pharmacy_id: pharmacyId,
        items: cart.items.map((item: any) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
        delivery_address: deliveryAddress,
        delivery_city: deliveryCity,
        delivery_phone: deliveryPhone,
        payment_method: paymentMethod,
        payment_phone: paymentPhone,
      };

      const response = await api.post('/orders', orderData);
      
      Alert.alert(
        'Order Placed Successfully!',
        `Order ID: ${response.data.order_id}\nPayment Reference: ${response.data.payment_reference}\nTotal: GH₵ ${response.data.total_amount.toFixed(2)}`,
        [
          {
            text: 'View Orders',
            onPress: () => router.replace('/orders'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Checkout error:', error);
      Alert.alert('Order Failed', error.response?.data?.detail || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A237E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {requiresPrescription === 'true' && (
            <View style={styles.prescriptionWarning}>
              <Ionicons name="warning" size={24} color="#F44336" />
              <Text style={styles.warningText}>
                Your cart contains prescription items. You may need to upload a prescription.
              </Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Information</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Delivery Address"
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              placeholderTextColor="#BDBDBD"
            />
            
            <TextInput
              style={styles.input}
              placeholder="City"
              value={deliveryCity}
              onChangeText={setDeliveryCity}
              placeholderTextColor="#BDBDBD"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={deliveryPhone}
              onChangeText={setDeliveryPhone}
              keyboardType="phone-pad"
              placeholderTextColor="#BDBDBD"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            
            {PAYMENT_METHODS.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentOption,
                  paymentMethod === method.id && styles.paymentOptionSelected,
                ]}
                onPress={() => setPaymentMethod(method.id)}
              >
                <Ionicons
                  name={method.icon as any}
                  size={24}
                  color={paymentMethod === method.id ? '#4CAF50' : '#757575'}
                />
                <Text
                  style={[
                    styles.paymentText,
                    paymentMethod === method.id && styles.paymentTextSelected,
                  ]}
                >
                  {method.name}
                </Text>
                {paymentMethod === method.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                )}
              </TouchableOpacity>
            ))}
            
            <TextInput
              style={styles.input}
              placeholder="Mobile Money Phone Number"
              value={paymentPhone}
              onChangeText={setPaymentPhone}
              keyboardType="phone-pad"
              placeholderTextColor="#BDBDBD"
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.placeOrderButton, loading && styles.placeOrderButtonDisabled]}
            onPress={handlePlaceOrder}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.placeOrderText}>Place Order</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    padding: 16,
  },
  prescriptionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#D32F2F',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#F5F9FF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#263238',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginBottom: 12,
  },
  paymentOptionSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  paymentText: {
    flex: 1,
    fontSize: 16,
    color: '#757575',
  },
  paymentTextSelected: {
    color: '#1A237E',
    fontWeight: '600',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  placeOrderButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  placeOrderButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  placeOrderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});