import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

export default function VerificationStartScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<any>(null);
  const [requiredDocs, setRequiredDocs] = useState<any[]>([]);

  useEffect(() => {
    checkVerificationStatus();
    loadRequiredDocuments();
  }, []);

  const checkVerificationStatus = async () => {
    try {
      const response = await api.get('/verification/status');
      setVerificationStatus(response.data);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Error checking verification:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadRequiredDocuments = async () => {
    try {
      const response = await api.get(`/verification/required-documents/${user?.role}`);
      setRequiredDocs(response.data.required_documents || []);
    } catch (error) {
      console.error('Error loading required documents:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'in_review': return '#2196F3';
      case 'rejected': return '#F44336';
      default: return '#757575';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return 'checkmark-circle';
      case 'pending': return 'time';
      case 'in_review': return 'eye';
      case 'rejected': return 'close-circle';
      default: return 'help-circle';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A237E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Professional Verification</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {verificationStatus && verificationStatus.status !== 'not_submitted' ? (
          <View style={styles.statusCard}>
            <View style={[styles.statusIcon, { backgroundColor: getStatusColor(verificationStatus.status) + '20' }]}>
              <Ionicons name={getStatusIcon(verificationStatus.status)} size={48} color={getStatusColor(verificationStatus.status)} />
            </View>
            <Text style={styles.statusTitle}>
              {verificationStatus.status === 'approved' && 'Verified Professional'}
              {verificationStatus.status === 'pending' && 'Verification Pending'}
              {verificationStatus.status === 'in_review' && 'Under Review'}
              {verificationStatus.status === 'rejected' && 'Verification Rejected'}
            </Text>
            <Text style={styles.statusDescription}>
              {verificationStatus.status === 'approved' && 'Your professional credentials have been verified'}
              {verificationStatus.status === 'pending' && 'Your verification request is being processed'}
              {verificationStatus.status === 'in_review' && 'Our team is reviewing your documents'}
              {verificationStatus.status === 'rejected' && 'Please review the feedback and resubmit'}
            </Text>
            {verificationStatus.reviewer_notes && (
              <View style={styles.notesCard}>
                <Text style={styles.notesLabel}>Reviewer Notes:</Text>
                <Text style={styles.notesText}>{verificationStatus.reviewer_notes}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.welcomeCard}>
            <Ionicons name="shield-checkmark" size={64} color="#1976D2" />
            <Text style={styles.welcomeTitle}>Get Verified</Text>
            <Text style={styles.welcomeDescription}>
              Complete professional verification to unlock full platform features and build trust with patients.
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why Get Verified?</Text>
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.benefitText}>Build patient trust</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.benefitText}>Appear higher in search</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.benefitText}>Access premium features</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.benefitText}>Verified badge on profile</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Required Documents</Text>
          <Text style={styles.sectionDescription}>
            You'll need to provide the following documents for verification:
          </Text>
          {requiredDocs.map((doc, index) => (
            <View key={index} style={styles.documentCard}>
              <View style={styles.documentIcon}>
                <Ionicons name="document" size={24} color="#1976D2" />
              </View>
              <View style={styles.documentInfo}>
                <Text style={styles.documentName}>{doc.name}</Text>
                <Text style={styles.documentDescription}>{doc.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verification Process</Text>
          <View style={styles.processList}>
            <View style={styles.processItem}>
              <View style={styles.processNumber}>
                <Text style={styles.processNumberText}>1</Text>
              </View>
              <View style={styles.processContent}>
                <Text style={styles.processTitle}>Complete Application</Text>
                <Text style={styles.processDescription}>Fill in your professional details</Text>
              </View>
            </View>
            <View style={styles.processItem}>
              <View style={styles.processNumber}>
                <Text style={styles.processNumberText}>2</Text>
              </View>
              <View style={styles.processContent}>
                <Text style={styles.processTitle}>Upload Documents</Text>
                <Text style={styles.processDescription}>Submit required credentials</Text>
              </View>
            </View>
            <View style={styles.processItem}>
              <View style={styles.processNumber}>
                <Text style={styles.processNumberText}>3</Text>
              </View>
              <View style={styles.processContent}>
                <Text style={styles.processTitle}>Review Process</Text>
                <Text style={styles.processDescription}>2-5 business days</Text>
              </View>
            </View>
            <View style={styles.processItem}>
              <View style={styles.processNumber}>
                <Text style={styles.processNumberText}>4</Text>
              </View>
              <View style={styles.processContent}>
                <Text style={styles.processTitle}>Get Verified</Text>
                <Text style={styles.processDescription}>Start practicing with verified badge</Text>
              </View>
            </View>
          </View>
        </View>

        {(!verificationStatus || verificationStatus.status === 'not_submitted' || verificationStatus.status === 'rejected') && (
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => router.push('/verification/form')}
          >
            <Text style={styles.startButtonText}>
              {verificationStatus?.status === 'rejected' ? 'Resubmit Verification' : 'Start Verification'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9FF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A237E' },
  placeholder: { width: 32 },
  content: { flex: 1 },
  statusCard: { margin: 16, padding: 24, backgroundColor: '#FFFFFF', borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  statusIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  statusTitle: { fontSize: 24, fontWeight: 'bold', color: '#1A237E', marginBottom: 8 },
  statusDescription: { fontSize: 16, color: '#546E7A', textAlign: 'center', marginBottom: 16 },
  notesCard: { width: '100%', backgroundColor: '#FFF3E0', padding: 16, borderRadius: 12, marginTop: 16 },
  notesLabel: { fontSize: 14, fontWeight: 'bold', color: '#F57C00', marginBottom: 8 },
  notesText: { fontSize: 14, color: '#E65100', lineHeight: 20 },
  welcomeCard: { margin: 16, padding: 32, backgroundColor: '#FFFFFF', borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  welcomeTitle: { fontSize: 28, fontWeight: 'bold', color: '#1A237E', marginTop: 16, marginBottom: 8 },
  welcomeDescription: { fontSize: 16, color: '#546E7A', textAlign: 'center', lineHeight: 24 },
  section: { margin: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A237E', marginBottom: 12 },
  sectionDescription: { fontSize: 14, color: '#546E7A', marginBottom: 16, lineHeight: 20 },
  benefitsList: { gap: 12 },
  benefitItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitText: { fontSize: 16, color: '#263238' },
  documentCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  documentIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  documentInfo: { flex: 1 },
  documentName: { fontSize: 16, fontWeight: '600', color: '#1A237E', marginBottom: 4 },
  documentDescription: { fontSize: 13, color: '#546E7A', lineHeight: 18 },
  processList: { gap: 16 },
  processItem: { flexDirection: 'row', gap: 16 },
  processNumber: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1976D2', alignItems: 'center', justifyContent: 'center' },
  processNumberText: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  processContent: { flex: 1 },
  processTitle: { fontSize: 16, fontWeight: '600', color: '#1A237E', marginBottom: 4 },
  processDescription: { fontSize: 14, color: '#546E7A' },
  startButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1976D2', margin: 16, padding: 16, borderRadius: 12, gap: 8 },
  startButtonText: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
});