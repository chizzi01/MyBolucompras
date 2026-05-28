import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Image, FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORIAS_IMAGENES } from '../../constants/imagenesViaje';
import { colors, spacing, radius, typography } from '../../constants/theme';

export default function ImagenGaleriaModal({
  visible,
  onClose,
  onSelect,
  currentUrl = null,
  previewEmoji = '✈️',
  previewTitulo = 'Tu viaje',
}) {
  const insets = useSafeAreaInsets();
  const [categoriaIdx, setCategoriaIdx] = useState(0);
  const [selectedUrl, setSelectedUrl] = useState(currentUrl);

  useEffect(() => {
    if (visible) setSelectedUrl(currentUrl);
  }, [visible, currentUrl]);

  const categoria = CATEGORIAS_IMAGENES[categoriaIdx];

  const handleConfirm = () => {
    onSelect(selectedUrl ? selectedUrl + '?w=1200&q=80' : null);
    onClose();
  };

  const handleClear = () => {
    onSelect(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Foto de portada</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cats}
          >
            {CATEGORIAS_IMAGENES.map((cat, i) => (
              <TouchableOpacity
                key={cat.nombre}
                style={[styles.cat, categoriaIdx === i && styles.catActive]}
                onPress={() => setCategoriaIdx(i)}
              >
                <Text style={[styles.catText, categoriaIdx === i && styles.catTextActive]}>
                  {cat.emoji} {cat.nombre}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <FlatList
            data={categoria.imagenes}
            numColumns={3}
            keyExtractor={(item) => item}
            scrollEnabled={false}
            columnWrapperStyle={styles.gridRow}
            style={styles.grid}
            renderItem={({ item }) => {
              const isSelected = selectedUrl === item;
              return (
                <TouchableOpacity
                  style={[styles.thumb, isSelected && styles.thumbSelected]}
                  onPress={() => setSelectedUrl(item)}
                  activeOpacity={0.75}
                >
                  <Image
                    source={{ uri: item + '?w=200&q=70' }}
                    style={styles.thumbImg}
                    resizeMode="cover"
                  />
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={10} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />

          {selectedUrl && (
            <>
              <Text style={styles.previewLabel}>Vista previa</Text>
              <View style={styles.previewBox}>
                <Image
                  source={{ uri: selectedUrl + '?w=800&q=80' }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['rgba(0,0,0,0.20)', 'rgba(0,0,0,0.65)']}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.previewEmoji}>{previewEmoji}</Text>
                <Text style={styles.previewTitulo}>{previewTitulo}</Text>
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.confirmBtn, !selectedUrl && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={!selectedUrl}
          >
            <Text style={styles.confirmText}>Usar esta imagen</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
            <Text style={styles.clearText}>Sin imagen (usar gradiente)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.md,
  },
  handle: { width: 40, height: 4, backgroundColor: '#334155', borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  title: { ...typography.h3, color: '#fff' },
  cancelText: { color: colors.textSecondary.dark, fontSize: 14 },
  cats: { gap: 8, paddingBottom: spacing.sm },
  cat: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  catActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catText: { fontSize: 13, color: '#94A3B8' },
  catTextActive: { color: '#fff', fontWeight: '600' },
  grid: { marginVertical: spacing.sm },
  gridRow: { gap: 6, marginBottom: 6 },
  thumb: {
    flex: 1,
    height: 72,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbSelected: { borderColor: colors.primary },
  thumbImg: { width: '100%', height: '100%' },
  checkBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLabel: {
    fontSize: 11,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    marginBottom: 6,
  },
  previewBox: {
    height: 80,
    borderRadius: radius.md,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 10,
    marginBottom: spacing.md,
  },
  previewEmoji: { fontSize: 18, marginBottom: 2 },
  previewTitulo: { color: '#fff', fontSize: 13, fontWeight: '700' },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  clearBtn: { alignItems: 'center', paddingVertical: 10 },
  clearText: { color: '#64748B', fontSize: 13 },
});
