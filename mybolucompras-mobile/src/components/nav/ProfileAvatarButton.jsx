import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../constants/theme';

// Botón de perfil que reemplaza al tab "Config": vive en el header de cada
// pantalla principal y empuja Configuración en el stack padre (ya no es un tab).
export default function ProfileAvatarButton({ size = 30, style }) {
  const navigation = useNavigation();
  const { user } = useAuth();
  const nombre = user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'U';
  const inicial = nombre[0]?.toUpperCase() || 'U';

  const goToConfig = () => {
    const parent = navigation.getParent();
    (parent || navigation).navigate('Configuracion');
  };

  return (
    <TouchableOpacity
      onPress={goToConfig}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel="Abrir configuración"
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }, style]}
    >
      <Text style={[styles.text, { fontSize: size * 0.36 }]}>{inicial}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontWeight: '800',
  },
});
