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

interface Reply {
  id: string;
  author: string;
  content: string;
  created_at: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  tags: string[];
  likes_count: number;
  replies_count: number;
  created_at: string;
  replies?: Reply[];
}

export default function ForumPostDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPostDetails();
  }, []);

  const fetchPostDetails = async () => {
    try {
      const response = await api.get(`/forum/posts/${id}`);
      setPost(response.data);
    } catch (error) {
      console.error('Error fetching post:', error);
      Alert.alert('Error', 'Failed to load post details');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    try {
      await api.post(`/forum/posts/${id}/like`);
      // Refresh post to get updated likes count
      fetchPostDetails();
    } catch (error) {
      console.error('Error liking post:', error);
      Alert.alert('Error', 'Failed to like post');
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) {
      Alert.alert('Error', 'Please enter a reply');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/forum/posts/${id}/replies`, {
        content: replyText,
      });
      setReplyText('');
      fetchPostDetails();
      Alert.alert('Success', 'Reply posted successfully');
    } catch (error: any) {
      console.error('Error posting reply:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  const renderReply = (reply: Reply) => (
    <View key={reply.id} style={styles.replyCard}>
      <View style={styles.replyHeader}>
        <View style={styles.authorIcon}>
          <Ionicons name="person" size={16} color="#757575" />
        </View>
        <View style={styles.replyInfo}>
          <Text style={styles.replyAuthor}>{reply.author}</Text>
          <Text style={styles.replyDate}>
            {new Date(reply.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <Text style={styles.replyContent}>{reply.content}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#F44336" />
          <Text style={styles.errorText}>Post not found</Text>
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
        <Text style={styles.headerTitle}>Forum Post</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.postCard}>
            <Text style={styles.postTitle}>{post.title}</Text>
            
            <View style={styles.postMeta}>
              <View style={styles.authorInfo}>
                <Ionicons name="person-circle" size={20} color="#757575" />
                <Text style={styles.authorName}>{post.author}</Text>
              </View>
              <Text style={styles.postDate}>
                {new Date(post.created_at).toLocaleDateString()}
              </Text>
            </View>

            {post.tags && post.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {post.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.postContent}>{post.content}</Text>

            <View style={styles.postActions}>
              <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                <Ionicons name="heart" size={20} color="#F44336" />
                <Text style={styles.actionText}>{post.likes_count} Likes</Text>
              </TouchableOpacity>
              <View style={styles.actionButton}>
                <Ionicons name="chatbubble" size={20} color="#2196F3" />
                <Text style={styles.actionText}>{post.replies_count} Replies</Text>
              </View>
            </View>
          </View>

          <View style={styles.repliesSection}>
            <Text style={styles.repliesTitle}>Replies ({post.replies_count})</Text>
            
            {post.replies && post.replies.length > 0 ? (
              post.replies.map(renderReply)
            ) : (
              <View style={styles.noReplies}>
                <Ionicons name="chatbubbles" size={48} color="#BDBDBD" />
                <Text style={styles.noRepliesText}>No replies yet. Be the first to reply!</Text>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.replyInputContainer}>
          <TextInput
            style={styles.replyInput}
            placeholder="Write a reply..."
            value={replyText}
            onChangeText={setReplyText}
            multiline
            placeholderTextColor="#BDBDBD"
          />
          <TouchableOpacity
            style={[styles.sendButton, submitting && styles.sendButtonDisabled]}
            onPress={handleReply}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFFFFF" />
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
    paddingBottom: 100,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  postTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 12,
  },
  postMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#546E7A',
  },
  postDate: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '600',
  },
  postContent: {
    fontSize: 16,
    color: '#37474F',
    lineHeight: 24,
    marginBottom: 16,
  },
  postActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    color: '#546E7A',
    fontWeight: '600',
  },
  repliesSection: {
    marginBottom: 16,
  },
  repliesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 12,
  },
  replyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  authorIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  replyInfo: {
    flex: 1,
  },
  replyAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A237E',
  },
  replyDate: {
    fontSize: 11,
    color: '#9E9E9E',
  },
  replyContent: {
    fontSize: 14,
    color: '#546E7A',
    lineHeight: 20,
  },
  noReplies: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noRepliesText: {
    fontSize: 14,
    color: '#757575',
    marginTop: 12,
  },
  replyInputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#F5F9FF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#263238',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
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