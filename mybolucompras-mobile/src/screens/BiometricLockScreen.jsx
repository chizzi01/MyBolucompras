import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { colors, spacing, radius, typography } from '../constants/theme';

export default function BiometricLockScreen() {
  const { unlockApp, signOut, authenticateWithBiometrics } = useAuth();
  const { dark } = useTheme();
  const s = styles(dark);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const authenticate = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await authenticateWithBiometrics();
      if (result.success) {
        unlockApp();
      } else if (result.error !== 'user_cancel' && result.error !== 'system_cancel') {
        setError('No se pudo verificar la identidad. Intentá de nuevo.');
      }
    } catch {
      setError('Error al acceder al sensor biométrico.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    authenticate();
  }, []);

  return (
    <View style={s.root}>
      <View style={s.content}>
        <Image
          source={require('../../assets/MyBolucompras.png')}
          style={s.logo}
          resizeMode="contain"
        />
        <Text style={s.appName}>Bolucompras</Text>
        <Text style={s.subtitle}>La app está bloqueada</Text>

        <View style={s.iconWrap}>
          <Ionicons name="finger-print" size={72} color={colors.primary} />
        </View>

        {!!error && (
          <View style={s.errorWrap}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity style={s.btn} onPress={authenticate} disabled={loading} activeOpacity={0.82}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="finger-print" size={20} color="#fff" />
              <Text style={s.btnText}>Desbloquear con huella</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={s.signOutBtn} onPress={signOut}>
          <Ionicons name="log-out-outline" size={16} color={colors.error} />
          <Text style={s.signOutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = (dark) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: dark ? colors.background.dark : colors.background.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    width: '100%',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 18,
    marginBottom: spacing.sm,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.body,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
    marginBottom: spacing.xl,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: dark ? colors.surface.dark : '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    marginBottom: spacing.xl,
  },
  errorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: dark ? '#2d1010' : '#FEF2F2',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: dark ? '#7f1d1d' : '#FECACA',
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    flex: 1,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    width: '100%',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: spacing.md,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  signOutText: {
    ...typography.body,
    color: colors.error,
  },
});
