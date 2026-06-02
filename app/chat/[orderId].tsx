/**
 * Fresh — Chat Screen (Real-time with Supabase)
 */

import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform,
  Image, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../src/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { ChatMessage } from '../../src/types';
import { supabase } from '../../src/api/supabase';
import { useDynamic } from '../../src/hooks/useDynamic';
import * as ImagePicker from 'expo-image-picker';

export default function ChatScreen() {
  const d = useDynamic();

  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // Subscribe to real-time chat messages
  useEffect(() => {
    if (!orderId || !supabase) return;

    // Fetch existing messages
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    fetchMessages();

    // Real-time subscription
    const channel = supabase
      .channel(`chat-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  // Auto scroll to bottom
  useEffect(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !orderId || !user || !supabase || sending) return;

    const sender = user.role === 'admin' ? 'admin' : 'user';
    setInput('');
    setSending(true);

    try {
      await supabase.from('chat_messages').insert({
        order_id: orderId,
        sender,
        text,
        type: 'text',
      });
    } catch (err) {
      console.error('Chat send error:', err);
      // Restore input on failure so user can retry
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const pickAndSendImage = async () => {
    if (!orderId || !user || !supabase || uploadingImage) return;

    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photos to send images.');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7,
        base64: Platform.OS === 'web', // Use base64 on web for upload
      });

      if (result.canceled || !result.assets?.[0]) return;

      setUploadingImage(true);
      const asset = result.assets[0];
      const fileExt = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${orderId}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      let uploadError: any = null;

      if (Platform.OS === 'web') {
        // On web, fetch the blob from the URI
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const { error } = await supabase.storage
          .from('chat-images')
          .upload(fileName, blob, {
            contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
            upsert: false,
          });
        uploadError = error;
      } else {
        // On native, read file as base64
        const FileSystem = require('expo-file-system');
        const base64Data = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const byteArray = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const { error } = await supabase.storage
          .from('chat-images')
          .upload(fileName, byteArray, {
            contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
            upsert: false,
          });
        uploadError = error;
      }

      if (uploadError) {
        console.error('Upload error:', uploadError);
        Alert.alert('Upload failed', 'Could not upload image. Please try again.');
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chat-images')
        .getPublicUrl(fileName);

      const imageUrl = urlData?.publicUrl;
      if (!imageUrl) {
        Alert.alert('Error', 'Could not get image URL.');
        return;
      }

      // Send image message
      const sender = user.role === 'admin' ? 'admin' : 'user';
      await supabase.from('chat_messages').insert({
        order_id: orderId,
        sender,
        text: imageUrl,
        type: 'image',
      });
    } catch (err: any) {
      console.error('Image send error:', err);
      Alert.alert('Error', 'Failed to send image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    if (item.sender === 'system') {
      return (
        <View style={styles.systemMsg}>
          <Text style={styles.systemMsgText}>{item.text}</Text>
        </View>
      );
    }

    const isAdmin = item.sender === 'admin';

    if (item.type === 'qr') {
      return (
        <View style={[styles.msgBubble, styles.adminBubble]}>
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>UPI Payment QR</Text>
            <View style={styles.qrIcon}>
              <Ionicons name="qr-code" size={48} color={colors.primary} />
            </View>
            <Text style={styles.qrUpi}>nutriva@upi</Text>
            <Text style={styles.qrNote}>
              Scan to pay · Amount: {item.amount || 'As discussed'}
            </Text>
          </View>
          <Text style={styles.msgTime}>{formatTime(item.created_at)}</Text>
        </View>
      );
    }

    // Image message
    if (item.type === 'image') {
      return (
        <View style={[styles.msgBubble, isAdmin ? styles.adminBubble : styles.userBubble, styles.imageBubble]}>
          <Image
            source={{ uri: item.text }}
            style={styles.chatImage}
            resizeMode="cover"
          />
          <Text style={[styles.msgTime, isAdmin && styles.adminTime]}>
            {formatTime(item.created_at)}
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.msgBubble, isAdmin ? styles.adminBubble : styles.userBubble]}>
        <Text style={[styles.msgText, isAdmin ? styles.adminText : styles.userText]}>
          {item.text}
        </Text>
        <Text style={[styles.msgTime, isAdmin && styles.adminTime]}>
          {formatTime(item.created_at)}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, d.s.text]}>Order Chat</Text>
          <Text style={styles.headerStatus}>Active</Text>
        </View>
        <View style={styles.headerAvatar}>
          <Ionicons name="headset" size={22} color={colors.onPrimary} />
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      {/* Upload indicator */}
      {uploadingImage && (
        <View style={styles.uploadingBar}>
          <ActivityIndicator size="small" color="#2E7D32" />
          <Text style={styles.uploadingText}>Uploading image...</Text>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputBar}>
        <Pressable
          style={styles.attachBtn}
          onPress={pickAndSendImage}
          disabled={uploadingImage}
        >
          <Ionicons name="image-outline" size={22} color={uploadingImage ? 'rgba(46,125,50,0.3)' : '#2E7D32'} />
        </Pressable>
        <TextInput
          style={styles.inputField}
          placeholder="Type a message..."
          placeholderTextColor={colors.outline}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <Pressable style={styles.sendBtn} onPress={sendMessage}>
          <Ionicons name="send" size={20} color={colors.onPrimary} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7F5' },
  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.base,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.base,
    paddingTop: 48, backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(46, 125, 50, 0.08)',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(46, 125, 50, 0.06)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.10)',
  },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1B3C12' },
  headerStatus: { fontSize: 12, color: '#43A047', marginTop: 2 },
  headerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(46, 125, 50, 0.10)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.18)',
  },
  // Messages
  messagesList: { padding: spacing.lg, paddingBottom: 8 },
  msgBubble: { maxWidth: '80%', marginBottom: spacing.sm, borderRadius: radius.md, padding: spacing.base },
  adminBubble: { alignSelf: 'flex-start', backgroundColor: 'rgba(255, 255, 255, 0.7)', borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.10)' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#2E7D32', borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.18)' },
  imageBubble: { padding: 4, overflow: 'hidden' },
  msgText: { fontSize: 14, lineHeight: 20 },
  adminText: { color: '#2E4A26' },
  userText: { color: '#FFFFFF' },
  msgTime: { fontSize: 10, color: 'rgba(27, 60, 18, 0.35)', marginTop: 4, alignSelf: 'flex-end' },
  adminTime: { color: 'rgba(27, 60, 18, 0.35)' },
  systemMsg: { alignItems: 'center', marginVertical: spacing.sm },
  systemMsgText: { fontSize: 12, color: 'rgba(27, 60, 18, 0.5)', fontStyle: 'italic' },
  // Image in chat
  chatImage: {
    width: 200, height: 200, borderRadius: radius.md - 2,
  },
  // QR Card
  qrCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: radius.sm,
    padding: spacing.lg, alignItems: 'center', marginBottom: 4,
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.12)',
  },
  qrTitle: { fontSize: 14, fontWeight: '700', marginBottom: spacing.base, color: '#1B3C12' },
  qrIcon: { marginBottom: spacing.base },
  qrUpi: { fontSize: 14, fontWeight: '600', color: '#2E7D32' },
  qrNote: { fontSize: 11, color: 'rgba(27, 60, 18, 0.5)', marginTop: 4 },
  // Upload indicator
  uploadingBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 8, backgroundColor: 'rgba(46, 125, 50, 0.06)',
    borderTopWidth: 1, borderTopColor: 'rgba(46, 125, 50, 0.08)',
  },
  uploadingText: { fontSize: 13, color: '#2E7D32', fontWeight: '500' },
  // Input
  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.base,
    paddingBottom: 24, backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopWidth: 1, borderTopColor: 'rgba(46, 125, 50, 0.08)',
  },
  attachBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(46, 125, 50, 0.08)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.12)',
  },
  inputField: {
    flex: 1, backgroundColor: 'rgba(46, 125, 50, 0.05)', borderRadius: radius.full,
    paddingHorizontal: spacing.lg, paddingVertical: 12, fontSize: 15,
    color: '#2E4A26', borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.08)',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#2E7D32', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.18)',
  },
});
