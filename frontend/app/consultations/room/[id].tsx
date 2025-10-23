import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../services/api';

export default function VideoConsultationRoomScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [consultationData, setConsultationData] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [inCall, setInCall] = useState(false);

  useEffect(() => {
    joinConsultation();
  }, []);

  const joinConsultation = async () => {
    try {
      const response = await api.post(`/consultations/${id}/join`);
      setConsultationData(response.data);
      setInCall(true);
    } catch (error: any) {
      console.error('Error joining consultation:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to join consultation', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  };

  const handleEndCall = () => {
    Alert.alert(
      'End Consultation',
      'Are you sure you want to end this consultation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Call',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/consultations/${id}/end`);
              Alert.alert('Consultation Ended', 'Thank you for using Glenx MedHub', [
                { text: 'OK', onPress: () => router.replace('/consultations') },
              ]);
            } catch (error) {
              console.error('Error ending consultation:', error);
              Alert.alert('Error', 'Failed to end consultation');
            }
          },
        },
      ]
    );
  };

  if (!consultationData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Connecting to consultation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.videoContainer}>
        <View style={styles.remoteVideo}>
          <Ionicons name="person" size={80} color="#FFFFFF" />
          <Text style={styles.participantName}>{consultationData.doctor_name}</Text>
          <Text style={styles.mockLabel}>MOCK VIDEO STREAM</Text>
        </View>

        <View style={styles.localVideo}>
          <Ionicons name="person" size={40} color="#FFFFFF" />
          <Text style={styles.youLabel}>You</Text>
        </View>
      </View>

      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Ionicons name="time" size={16} color="#FFFFFF" />
          <Text style={styles.infoText}>00:00</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="videocam" size={16} color="#4CAF50" />
          <Text style={[styles.infoText, { color: '#4CAF50' }]}>Connected</Text>
        </View>
      </View>

      <View style={styles.controlsContainer}>
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
            onPress={() => setIsMuted(!isMuted)}
          >
            <Ionicons
              name={isMuted ? 'mic-off' : 'mic'}
              size={28}
              color={isMuted ? '#F44336' : '#FFFFFF'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, isVideoOff && styles.controlButtonActive]}
            onPress={() => setIsVideoOff(!isVideoOff)}
          >
            <Ionicons
              name={isVideoOff ? 'videocam-off' : 'videocam'}
              size={28}
              color={isVideoOff ? '#F44336' : '#FFFFFF'}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
            <Ionicons name="call" size={32} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton}>
            <Ionicons name="chatbubble" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton}>
            <Ionicons name="camera-reverse" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.roomInfo}>
          <Text style={styles.roomText}>Room ID: {consultationData.room_id}</Text>
          <Text style={styles.roomText}>Type: {consultationData.consultation_type}</Text>
        </View>
      </View>

      <View style={styles.mockBanner}>
        <Ionicons name="information-circle" size={20} color="#FF9800" />
        <Text style={styles.mockBannerText}>
          Mock Video Room - Real Agora integration requires Agora App ID & Token
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  remoteVideo: {
    flex: 1,
    backgroundColor: '#1A237E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
  },
  mockLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 8,
    opacity: 0.7,
  },
  localVideo: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 120,
    height: 160,
    backgroundColor: '#263238',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  youLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 8,
  },
  infoBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  controlsContainer: {
    paddingBottom: 32,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
  },
  endCallButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '135deg' }],
  },
  roomInfo: {
    alignItems: 'center',
    gap: 4,
  },
  roomText: {
    fontSize: 12,
    color: '#BDBDBD',
  },
  mockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#FF9800',
  },
  mockBannerText: {
    flex: 1,
    fontSize: 11,
    color: '#FF9800',
  },
});