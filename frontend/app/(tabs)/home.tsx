import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import DoctorDashboard from '../../components/dashboards/DoctorDashboard';
import PharmacyDashboard from '../../components/dashboards/PharmacyDashboard';
import HospitalDashboard from '../../components/dashboards/HospitalDashboard';
import api from '../../services/api';

const { width } = Dimensions.get('window');

interface Promotion {
  id: string;
  provider_name: string;
  provider_role: string;
  title: string;
  description: string;
  discount_percentage?: number;
  discount_amount?: number;
  promotional_text: string;
  image_base64?: string;
  category: string;
  is_featured: boolean;
}

function PromotionsCarousel() {
  const router = useRouter();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      const response = await api.get('/promotions/active');
      setPromotions(response.data);
    } catch (error) {
      console.error('Error fetching promotions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePromotionClick = async (promotion: Promotion) => {
    try {
      await api.post(`/promotions/${promotion.id}/click`);
      
      // Navigate based on category
      switch (promotion.category) {
        case 'pharmacy':
          router.push('/pharmacies');
          break;
        case 'ambulance':
          router.push('/ambulances');
          break;
        case 'hospital':
          router.push('/doctors');
          break;
        case 'consultation':
          router.push('/consultations');
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.promotionsContainer}>
        <ActivityIndicator size="small" color="#4CAF50" />
      </View>
    );
  }

  if (promotions.length === 0) {
    return null; // Don't show section if no promotions
  }

  const renderPromotion = (promotion: Promotion, index: number) => (
    <TouchableOpacity
      key={promotion.id}
      style={styles.promotionCard}
      onPress={() => handlePromotionClick(promotion)}
      activeOpacity={0.9}
    >
      <View style={styles.promotionContent}>
        <View style={styles.promotionBadge}>
          <Ionicons 
            name={promotion.category === 'pharmacy' ? 'flask' : promotion.category === 'ambulance' ? 'car' : 'medkit'} 
            size={16} 
            color="#FFFFFF" 
          />
          <Text style={styles.promotionBadgeText}>
            {promotion.category.toUpperCase()}
          </Text>
        </View>
        
        <Text style={styles.promotionTitle} numberOfLines={2}>
          {promotion.title}
        </Text>
        
        <Text style={styles.promotionDescription} numberOfLines={2}>
          {promotion.description}
        </Text>
        
        {promotion.discount_percentage && (
          <View style={styles.discountBanner}>
            <Text style={styles.discountText}>
              {promotion.discount_percentage}% OFF
            </Text>
          </View>
        )}
        
        <View style={styles.promotionFooter}>
          <View style={styles.providerInfo}>
            <Ionicons name="business" size={14} color="#757575" />
            <Text style={styles.providerName} numberOfLines={1}>
              {promotion.provider_name}
            </Text>
          </View>
          <View style={styles.shopNowButton}>
            <Text style={styles.shopNowText}>Shop Now</Text>
            <Ionicons name="arrow-forward" size={16} color="#4CAF50" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.promotionsSection}>
      <View style={styles.promotionHeader}>
        <Ionicons name="megaphone" size={24} color="#FF9800" />
        <Text style={styles.promotionSectionTitle}>Special Offers</Text>
      </View>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        snapToInterval={width - 48}
        decelerationRate="fast"
        contentContainerStyle={styles.promotionsScroll}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / (width - 48));
          setCurrentIndex(index);
        }}
      >
        {promotions.map(renderPromotion)}
      </ScrollView>
      
      {promotions.length > 1 && (
        <View style={styles.paginationDots}>
          {promotions.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.activeDot,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  // Show role-specific dashboard
  if (user?.role === 'doctor') {
    return (
      <SafeAreaView style={styles.container}>
        <DoctorDashboard userName={user.full_name} />
      </SafeAreaView>
    );
  }

  if (user?.role === 'pharmacy') {
    return (
      <SafeAreaView style={styles.container}>
        <PharmacyDashboard userName={user.full_name} />
      </SafeAreaView>
    );
  }

  if (user?.role === 'hospital') {
    return (
      <SafeAreaView style={styles.container}>
        <HospitalDashboard />
      </SafeAreaView>
    );
  }

  if (user?.role === 'ambulance') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Welcome,</Text>
              <Text style={styles.userName}>{user?.full_name || 'Guest'}</Text>
            </View>
            <Ionicons name="notifications-outline" size={28} color="#1A237E" />
          </View>

          <View style={styles.heroCard}>
            <Ionicons name="car" size={48} color="#F44336" />
            <Text style={styles.heroTitle}>Ambulance Service</Text>
            <Text style={styles.heroSubtitle}>
              Emergency medical transport and rescue operations
            </Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#FFEBEE' }]}>
              <Ionicons name="car" size={32} color="#F44336" />
              <Text style={styles.statValue}>Available</Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="navigate" size={32} color="#2196F3" />
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Active Trips</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="toggle" size={32} color="#F44336" />
            <View style={styles.actionText}>
              <Text style={styles.actionCardTitle}>Update Availability</Text>
              <Text style={styles.actionSubtitle}>Set your service status</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (user?.role === 'herbalist') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Welcome,</Text>
              <Text style={styles.userName}>{user?.full_name || 'Guest'}</Text>
            </View>
            <Ionicons name="notifications-outline" size={28} color="#1A237E" />
          </View>

          <View style={styles.heroCard}>
            <Ionicons name="leaf" size={48} color="#4CAF50" />
            <Text style={styles.heroTitle}>Traditional Medicine</Text>
            <Text style={styles.heroSubtitle}>
              Herbal remedies and traditional healing practices
            </Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="calendar" size={32} color="#4CAF50" />
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Consultations</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="star" size={32} color="#FFB300" />
              <Text style={styles.statValue}>0.0</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/appointments')}>
            <Ionicons name="calendar" size={32} color="#4CAF50" />
            <View style={styles.actionText}>
              <Text style={styles.actionCardTitle}>View Appointments</Text>
              <Text style={styles.actionSubtitle}>Manage your consultations</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Default patient dashboard

  const quickActions = [
    {
      id: '1',
      title: 'Find Doctors',
      icon: 'medkit',
      color: '#4CAF50',
      route: '/doctors',
    },
    {
      id: '2',
      title: 'My Appointments',
      icon: 'calendar',
      color: '#2196F3',
      route: '/appointments',
    },
    {
      id: '3',
      title: 'Pharmacy Shops',
      icon: 'flask',
      color: '#FF9800',
      route: '/pharmacies',
    },
    {
      id: '4',
      title: 'Ambulance Services',
      icon: 'car',
      color: '#F44336',
      route: '/ambulances',
    },
    {
      id: '5',
      title: 'AI Diagnostics',
      icon: 'chatbubble-ellipses',
      color: '#9C27B0',
      route: '/ai-diagnostics',
    },
    {
      id: '6',
      title: 'Medical Records',
      icon: 'document-text',
      color: '#2196F3',
      route: '/medical-records',
    },
    {
      id: '7',
      title: 'Video Consultation',
      icon: 'videocam',
      color: '#00BCD4',
      route: '/consultations',
    },
    {
      id: '8',
      title: 'My Orders',
      icon: 'cart',
      color: '#4CAF50',
      route: '/orders',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName}>{user?.full_name || 'Guest'}</Text>
          </View>
          <Ionicons name="notifications-outline" size={28} color="#1A237E" />
        </View>

        <View style={styles.heroCard}>
          <Ionicons name="heart" size={48} color="#4CAF50" />
          <Text style={styles.heroTitle}>Your Health Matters</Text>
          <Text style={styles.heroSubtitle}>
            Book appointments with certified doctors anytime, anywhere
          </Text>
        </View>

        <PromotionsCarousel />

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionCard}
              onPress={() => router.push(action.route as any)}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: action.color + '20' }]}>
                <Ionicons name={action.icon as any} size={32} color={action.color} />
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Why Choose Glenx MedHub?</Text>
          <View style={styles.infoCard}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Certified Doctors</Text>
              <Text style={styles.infoSubtitle}>All doctors are verified and licensed</Text>
            </View>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="time" size={24} color="#2196F3" />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>24/7 Availability</Text>
              <Text style={styles.infoSubtitle}>Healthcare when you need it</Text>
            </View>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="shield-checkmark" size={24} color="#FF9800" />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Secure & Private</Text>
              <Text style={styles.infoSubtitle}>Your data is protected</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
    marginTop: 16,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#546E7A',
    textAlign: 'center',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#263238',
    textAlign: 'center',
  },
  infoSection: {
    marginTop: 8,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  promotionsSection: {
    marginBottom: 24,
  },
  promotionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  promotionSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  promotionsContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  promotionsScroll: {
    paddingHorizontal: 16,
    gap: 16,
  },
  promotionCard: {
    width: width - 64,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  promotionContent: {
    padding: 16,
  },
  promotionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  promotionBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  promotionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 8,
  },
  promotionDescription: {
    fontSize: 14,
    color: '#546E7A',
    lineHeight: 20,
    marginBottom: 12,
  },
  discountBanner: {
    backgroundColor: '#F44336',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  discountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  promotionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  providerName: {
    fontSize: 13,
    color: '#757575',
    fontWeight: '500',
  },
  shopNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  shopNowText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#BDBDBD',
  },
  activeDot: {
    backgroundColor: '#FF9800',
    width: 24,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
  },
  infoSubtitle: {
    fontSize: 14,
    color: '#546E7A',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
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
  actionText: {
    flex: 1,
    marginLeft: 12,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#546E7A',
    marginTop: 2,
  },
});
