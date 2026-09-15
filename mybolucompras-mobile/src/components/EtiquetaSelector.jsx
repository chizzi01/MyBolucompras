import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../constants/theme';
import { ETIQUETA_ICON_DEFAULT } from '../constants/catalogos';
import CrearEtiquetaModal from './CrearEtiquetaModal';

// Selector de etiquetas para cargar/editar un gasto — comparte con
// Configuración el mismo CrearEtiquetaModal para que crear una etiqueta
// se vea y funcione igual sin importar desde dónde se abra.
export default function EtiquetaSelector({ value, onChange, etiquetas, onCrearEtiqueta, dark }) {
  const s = styles(dark);
  const [modalVisible, setModalVisible] = useState(false);

  const handleCrear = async (nueva) => {
    await onCrearEtiqueta(nueva);
    onChange(nueva.nombre);
  };

  return (
    <View>
      <View style={s.tagsWrap}>
        {etiquetas.map(tag => {
          const nombre = typeof tag === 'string' ? tag : tag.nombre;
          const color = typeof tag === 'string' ? colors.primary : tag.color;
          const icono = (typeof tag === 'string' ? null : tag.icono) || ETIQUETA_ICON_DEFAULT;
          const activo = value === nombre;
          return (
            <TouchableOpacity
              key={nombre}
              style={[s.tag, { borderColor: color, backgroundColor: activo ? color : color + '20' }]}
              onPress={() => onChange(activo ? '' : nombre)}
            >
              <Ionicons name={icono} size={13} color={activo ? '#fff' : color} />
              <Text style={[s.tagText, { color: activo ? '#fff' : color }]}>{nombre}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={s.tagAdd} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={14} color={colors.primary} />
          <Text style={s.tagAddText}>Nueva</Text>
        </TouchableOpacity>
      </View>

      <CrearEtiquetaModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onGuardar={handleCrear}
        existentes={etiquetas}
      />
    </View>
  );
}

const styles = (dark) => StyleSheet.create({
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  tagText: {
    ...typography.captionMed,
  },
  tagAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  tagAddText: {
    ...typography.captionMed,
    color: colors.primary,
  },
});
