import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Image,
} from 'react-native';
import { useModal } from '../hooks/useModal';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { colors, spacing, radius, typography } from '../constants/theme';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const { dark } = useTheme();
  const s = styles(dark);

  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { showModal, modal } = useModal();

  const handleSubmit = async () => {
    if (!email || !password) {
      return showModal({ type: 'warning', title: 'Campos requeridos', message: 'Completá email y contraseña.' });
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
      } else {
        if (!nombre) {
          setLoading(false);
          return showModal({ type: 'warning', title: 'Campo requerido', message: 'Ingresá tu nombre.' });
        }
        await signUp(email.trim(), password, nombre.trim());
        showModal({
          type: 'success',
          title: 'Cuenta creada',
          message: 'Revisá tu email para confirmar tu cuenta.',
          onClose: () => setMode('login'),
        });
      }
    } catch (err) {
      showModal({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.root}>
      {modal}
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Image
            source={require('../../assets/MyBolucompras.png')}
            style={s.logo}
            resizeMode="contain"
          />
          <Text style={s.appName}>Bolucompras</Text>
          <Text style={s.subtitle}>Gestioná tus gastos en cuotas</Text>
        </View>

        <View style={s.card}>
          <Text style={s.title}>{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</Text>

          {mode === 'register' && (
            <View style={s.field}>
              <Text style={s.label}>Nombre</Text>
              <View style={s.inputRow}>
                <Ionicons name="person-outline" size={18} color={dark ? '#475569' : '#94A3B8'} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder="Tu nombre"
                  placeholderTextColor={dark ? '#475569' : '#94A3B8'}
                  value={nombre}
                  onChangeText={setNombre}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          <View style={s.field}>
            <Text style={s.label}>Email</Text>
            <View style={s.inputRow}>
              <Ionicons name="mail-outline" size={18} color={dark ? '#475569' : '#94A3B8'} style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="correo@ejemplo.com"
                placeholderTextColor={dark ? '#475569' : '#94A3B8'}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.label}>Contraseña</Text>
            <View style={s.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color={dark ? '#475569' : '#94A3B8'} style={s.inputIcon} />
              <TextInput
                style={[s.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor={dark ? '#475569' : '#94A3B8'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity onPress={() => setShowPass(v => !v)} style={s.eyeBtn}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={dark ? '#475569' : '#94A3B8'} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={s.btn} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name={mode === 'login' ? 'log-in-outline' : 'person-add-outline'} size={18} color="#fff" />
                <Text style={s.btnText}>{mode === 'login' ? 'Entrar' : 'Crear cuenta'}</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={s.switchBtn} onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
            <Text style={s.switchText}>
              {mode === 'login' ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Iniciá sesión'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (dark) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: dark ? colors.background.dark : colors.background.light,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 20,
    marginBottom: spacing.sm,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    ...typography.body,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
    marginTop: 4,
  },
  card: {
    backgroundColor: dark ? colors.surface.dark : colors.surface.light,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: dark ? 0.3 : 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    ...typography.h2,
    color: dark ? colors.text.dark : colors.text.light,
    marginBottom: spacing.lg,
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.captionMed,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: dark ? '#0F172A' : '#F8FAFC',
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    ...typography.body,
    color: dark ? colors.text.dark : colors.text.light,
  },
  eyeBtn: {
    paddingLeft: spacing.sm,
    paddingVertical: 12,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  switchBtn: {
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  switchText: {
    ...typography.body,
    color: colors.primary,
  },
});
