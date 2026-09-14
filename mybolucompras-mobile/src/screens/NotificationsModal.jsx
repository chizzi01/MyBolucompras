import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, ActivityIndicator, FlatList, Animated, PanResponder
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notificationService } from '../services/notificationService';
import { useTheme } from '../context/ThemeContext';
import { colors, spacing, radius, typography } from '../constants/theme';
import { formatFecha, formatPrecioEuropeo } from '../utils/formatters';
import { useNotificacionesPendientes } from '../hooks/queries/useNotificacionesPendientes';
import { useNotificacionesPendientesMutations } from '../hooks/mutations/useNotificacionesPendientesMutations';

const DELETE_WIDTH = 80;

function NotificationRow({ item, dark, onPress, onDelete }) {
  const s = styles(dark);
  const translateX = useRef(new Animated.Value(0)).current;
  const [open, setOpen] = useState(false);
  const esPendiente = item.__type === 'pendiente';

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        const base = open ? -DELETE_WIDTH : 0;
        const next = Math.min(0, Math.max(base + g.dx, -DELETE_WIDTH));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        if (!open && g.dx < -DELETE_WIDTH / 2) {
          Animated.spring(translateX, { toValue: -DELETE_WIDTH, useNativeDriver: true, bounciness: 4 }).start();
          setOpen(true);
        } else if (open && g.dx > DELETE_WIDTH / 2) {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
          setOpen(false);
        } else {
          Animated.spring(translateX, { toValue: open ? -DELETE_WIDTH : 0, useNativeDriver: true, bounciness: 4 }).start();
        }
      },
    })
  ).current;

  const close = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    setOpen(false);
  };

  return (
    <View style={s.rowContainer}>
      <View style={s.deleteContainer}>
        <TouchableOpacity style={s.deleteBtn} onPress={onDelete} activeOpacity={0.8}>
          <Ionicons name="trash-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <TouchableOpacity
          style={[s.item, esPendiente ? s.pendienteItem : (!item.read && s.unreadItem)]}
          onPress={() => { if (open) { close(); } else { onPress(); } }}
          activeOpacity={0.7}
        >
          {esPendiente ? (
            <>
              <View style={s.itemHeader}>
                <View style={s.dotContainer}>
                  <Ionicons name="card-outline" size={14} color={colors.primary} />
                  <Text style={s.itemTitle} numberOfLines={1}>Compra detectada: {item.comercioRaw || 'comercio desconocido'}</Text>
                </View>
                <Text style={s.itemDate}>{new Date(item.fechaDetectada).toLocaleDateString()}</Text>
              </View>
              <Text style={s.itemMessage}>
                {item.banco || 'Banco no identificado'}
                {item.medio ? ` · ${item.medio}` : ''}
                {item.ultimos4 ? ` ····${item.ultimos4}` : ''}
                {item.monto != null ? ` · ${formatPrecioEuropeo(item.monto, item.moneda || 'ARS')}` : ''}
                {' — '}
                <Text style={s.itemCta}>tocá para registrarla</Text>
              </Text>
            </>
          ) : (
            <>
              <View style={s.itemHeader}>
                <View style={s.dotContainer}>
                  {!item.read && <View style={s.unreadDot} />}
                  <Text style={s.itemTitle} numberOfLines={1}>{item.title}</Text>
                </View>
                <Text style={s.itemDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
              </View>
              <Text style={s.itemMessage}>{item.message}</Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export default function NotificationsModal({ visible, onClose, onRefresh, navigation }) {
  const { dark } = useTheme();
  const s = styles(dark);

  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { pendientes } = useNotificacionesPendientes();
  const { descartar } = useNotificacionesPendientesMutations();

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

  const handleDelete = async (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await notificationService.delete(id);
      onRefresh(); // Update unread count in dashboard
    } catch (e) {
      fetchNotifications(); // algo falló — volvemos a traer la lista real
    }
  };

  const combined = useMemo(() => {
    const notifItems = notifications.map((n) => ({ ...n, __type: 'notification', __fecha: n.created_at }));
    const pendienteItems = pendientes.map((p) => ({ ...p, __type: 'pendiente', __fecha: p.fechaDetectada }));
    return [...notifItems, ...pendienteItems].sort(
      (a, b) => new Date(b.__fecha).getTime() - new Date(a.__fecha).getTime(),
    );
  }, [notifications, pendientes]);

  const handlePressItem = (item) => {
    if (item.__type === 'pendiente') {
      onClose();
      navigation.navigate('Agregar', { pendiente: item });
    } else {
      handleMarkAsRead(item.id);
    }
  };

  const handleDeleteItem = (item) => {
    if (item.__type === 'pendiente') {
      descartar.mutate(item.id);
    } else {
      handleDelete(item.id);
    }
  };

  const renderItem = ({ item }) => (
    <NotificationRow
      item={item}
      dark={dark}
      onPress={() => handlePressItem(item)}
      onDelete={() => handleDeleteItem(item)}
    />
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
              data={combined}
              keyExtractor={item => `${item.__type}:${item.id}`}
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
  rowContainer: { marginBottom: spacing.sm, overflow: 'hidden', borderRadius: radius.md },
  deleteContainer: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    width: DELETE_WIDTH, borderRadius: radius.md, overflow: 'hidden',
  },
  deleteBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.error },
  item: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: dark ? colors.surface.dark : colors.surface.light,
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light
  },
  unreadItem: {
    borderColor: colors.primary,
  },
  pendienteItem: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, gap: spacing.sm },
  dotContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  itemTitle: { ...typography.bodyBold, color: dark ? colors.text.dark : colors.text.light, flexShrink: 1 },
  itemDate: { ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, flexShrink: 0 },
  itemMessage: { ...typography.body, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  itemCta: { color: colors.accent, fontWeight: '700' },
});
