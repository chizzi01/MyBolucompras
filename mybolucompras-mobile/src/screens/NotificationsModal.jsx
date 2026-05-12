import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, 
  ScrollView, ActivityIndicator, FlatList 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notificationService } from '../services/notificationService';
import { useTheme } from '../context/ThemeContext';
import { colors, spacing, radius, typography } from '../constants/theme';
import { formatFecha } from '../utils/formatters';

export default function NotificationsModal({ visible, onClose, onRefresh }) {
  const { dark } = useTheme();
  const s = styles(dark);
  
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationService.getAll();
      setNotifications(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchNotifications();
    }
  }, [visible]);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      onRefresh(); // Update unread count in dashboard
    } catch (e) {}
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[s.item, !item.read && s.unreadItem]} 
      onPress={() => handleMarkAsRead(item.id)}
      activeOpacity={0.7}
    >
      <View style={s.itemHeader}>
        <View style={s.dotContainer}>
          {!item.read && <View style={s.unreadDot} />}
          <Text style={s.itemTitle}>{item.title}</Text>
        </View>
        <Text style={s.itemDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      <Text style={s.itemMessage}>{item.message}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.overlay}>
        <View style={s.content}>
          <View style={s.header}>
            <Text style={s.title}>Notificaciones</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={24} color={dark ? colors.text.dark : colors.text.light} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              contentContainerStyle={s.list}
              ListEmptyComponent={
                <View style={s.center}>
                  <Ionicons name="notifications-off-outline" size={48} color={dark ? '#334155' : '#CBD5E1'} />
                  <Text style={s.emptyText}>No tenés notificaciones</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = (dark) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  content: { 
    backgroundColor: dark ? colors.background.dark : colors.background.light, 
    height: '80%', 
    borderTopLeftRadius: radius.xl, 
    borderTopRightRadius: radius.xl,
    overflow: 'hidden'
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: dark ? colors.border.dark : colors.border.light
  },
  title: { ...typography.h2, color: dark ? colors.text.dark : colors.text.light },
  closeBtn: { padding: 4 },
  list: { padding: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { ...typography.body, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, marginTop: 12 },
  item: { 
    padding: spacing.md, 
    borderRadius: radius.md, 
    backgroundColor: dark ? colors.surface.dark : colors.surface.light,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light
  },
  unreadItem: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '05'
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  dotContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  itemTitle: { ...typography.bodyBold, color: dark ? colors.text.dark : colors.text.light },
  itemDate: { ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  itemMessage: { ...typography.body, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
});
