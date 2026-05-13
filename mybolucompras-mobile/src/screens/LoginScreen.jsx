import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Image,
} from 'react-native';
import { useModal } from '../hooks/useModal';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { colors, spacing, radius, typography } from '../constants/theme';

function getPasswordStrength(password) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 6)  score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 'weak',   label: 'Muy débil',  segments: 1, color: '#EF4444' };
  if (score === 2) return { level: 'fair',   label: 'Débil',      segments: 2, color: '#F59E0B' };
  if (score === 3) return { level: 'good',   label: 'Aceptable',  segments: 3, color: '#3B82F6' };
  return             { level: 'strong', label: 'Segura',     segments: 4, color: '#10B981' };
}

const RESEND_SECONDS = 60;

export default function LoginScreen() {
  const { signIn, signUp, verifyEmail, resendCode } = useAuth();
  const { dark } = useTheme();
  const s = styles(dark);

  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'verify'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);
  const countdownRef = useRef(null);
  const { showModal, modal } = useModal();

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  // Countdown timer when entering verify mode
  useEffect(() => {
    if (mode === 'verify') {
      setCountdown(RESEND_SECONDS);
      setCanResend(false);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(countdownRef.current);
    }
    return () => clearInterval(countdownRef.current);
  }, [mode]);

  const resetRegisterFields = () => {
    setConfirmPassword('');
    setPasswordTouched(false);
    setShowPass(false);
    setShowConfirmPass(false);
  };

  const handleSubmit = async () => {
    if (!email || (mode !== 'verify' && !password)) {
      return showModal({ type: 'warning', title: 'Campos requeridos', message: 'Completá los campos necesarios.' });
    }
    if (mode === 'register' && password.length < 6) {
      return showModal({ type: 'warning', title: 'Contraseña muy corta', message: 'La contraseña debe tener al menos 6 caracteres.' });
    }
    if (mode === 'register' && password !== confirmPassword) {
      return showModal({ type: 'warning', title: 'Contraseñas distintas', message: 'Las contraseñas no coinciden. Verificalas e intentá de nuevo.' });
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
      } else if (mode === 'register') {
        if (!nombre) {
          setLoading(false);
          return showModal({ type: 'warning', title: 'Campo requerido', message: 'Ingresá tu nombre.' });
        }
        try {
          await signUp(email.trim(), password, nombre.trim());
          setMode('verify');
          resetRegisterFields();
        } catch (err) {
          if (err.message === 'USER_ALREADY_EXISTS') {
            showModal({
              type: 'warning',
              title: 'Usuario registrado',
              message: 'Ya existe una cuenta con este email. ¿Querés iniciar sesión o recuperar tu contraseña?',
              confirmText: 'Iniciar Sesión',
              onConfirm: () => setMode('login'),
            });
          } else {
            throw err;
          }
        }
      } else if (mode === 'verify') {
        if (otp.length < 8) {
          setOtpError('Ingresá el código de 8 dígitos.');
          setLoading(false);
          return;
        }
        setOtpError('');
        await verifyEmail(email.trim(), otp);
        showModal({
          type: 'success',
          title: 'Email verificado',
          message: 'Tu cuenta ha sido activada. Ya podés iniciar sesión.',
          onClose: () => setMode('login'),
        });
      }
    } catch (err) {
      if (err.message === 'VERIFY_REQUIRED') {
        setMode('verify');
        showModal({ type: 'warning', title: 'Verificación pendiente', message: 'Tu cuenta no está activa. Ingresá el código que enviamos a tu email.' });
      } else if (mode === 'verify') {
        setOtpError('Código incorrecto o expirado. Revisá tu email e intentá de nuevo.');
      } else {
        showModal({ type: 'error', title: 'Error', message: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || resending) return;
    setResending(true);
    try {
      await resendCode(email.trim());
      setOtp('');
      setOtpError('');
      setCountdown(RESEND_SECONDS);
      setCanResend(false);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      showModal({ type: 'success', title: 'Código reenviado', message: 'Revisá tu bandeja de entrada.' });
    } catch {
      showModal({ type: 'error', title: 'Error', message: 'No se pudo reenviar el código. Intentá de nuevo.' });
    } finally {
      setResending(false);
    }
  };

  // ── Verify screen (completely different layout) ──────────────────────────
  if (mode === 'verify') {
    return (
      <View style={s.root}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {modal}
          <ScrollView
            contentContainerStyle={s.verifyScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={s.verifyCard}>
              {/* Envelope icon */}
              <View style={s.verifyIconWrap}>
                <Ionicons name="mail-unread-outline" size={32} color={colors.primary} />
              </View>

              <Text style={s.verifyTitle}>Verificá tu cuenta</Text>
              <Text style={s.verifySubtitle}>
                Ingresá el código de 8 dígitos que enviamos a{'\n'}
                <Text style={s.verifyEmail}>{email}</Text>
              </Text>

              {/* OTP input */}
              <View style={s.field}>
                <Text style={s.label}>Código de verificación</Text>
                <TextInput
                  style={[s.otpInput, otpError ? s.otpInputError : null]}
                  placeholder="12345678"
                  placeholderTextColor={dark ? '#334155' : '#CBD5E1'}
                  value={otp}
                  onChangeText={v => { setOtp(v.replace(/\D/g, '')); setOtpError(''); }}
                  keyboardType="number-pad"
                  maxLength={8}
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                />
                {otpError ? (
                  <Text style={s.otpError}>⚠ {otpError}</Text>
                ) : null}
              </View>

              {/* Verify button */}
              <TouchableOpacity
                style={[s.btn, otp.length < 8 && s.btnDisabled]}
                onPress={handleSubmit}
                disabled={loading || otp.length < 8}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={s.btnText}>Verificar código</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Resend section */}
              <View style={s.resendContainer}>
                <Text style={s.resendLabel}>¿No recibiste el código?</Text>
                {canResend ? (
                  <TouchableOpacity onPress={handleResend} disabled={resending}>
                    {resending ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Text style={s.resendBtn}>Reenviar código</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <Text style={s.resendCountdown}>
                    Reenviar en <Text style={{ fontWeight: '700' }}>{countdown}s</Text>
                  </Text>
                )}
              </View>

              {/* Back link */}
              <TouchableOpacity
                style={s.backLink}
                onPress={() => { setOtp(''); setOtpError(''); setMode('register'); }}
              >
                <Ionicons name="arrow-back-outline" size={14} color={colors.primary} />
                <Text style={s.backLinkText}>Volver al registro</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ── Login / Register screen ───────────────────────────────────────────────
  return (
    <View style={s.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {modal}
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.header}>
            <Image
              source={require('../../assets/MyBolucompras.png')}
              style={s.logo}
              resizeMode="contain"
            />
            <Text style={s.appName}>MyBolucompras</Text>
            <Text style={s.subtitle}>Gestioná tus gastos</Text>
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

            {/* Password field */}
            <View style={s.field}>
              <Text style={s.label}>Contraseña</Text>
              <View style={s.inputRow}>
                <Ionicons name="lock-closed-outline" size={18} color={dark ? '#475569' : '#94A3B8'} style={s.inputIcon} />
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  placeholder="••••••••"
                  placeholderTextColor={dark ? '#475569' : '#94A3B8'}
                  value={password}
                  onChangeText={v => { setPassword(v); setPasswordTouched(true); }}
                  secureTextEntry={!showPass}
                />
                <TouchableOpacity onPress={() => setShowPass(v => !v)} style={s.eyeBtn}>
                  <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={dark ? '#475569' : '#94A3B8'} />
                </TouchableOpacity>
              </View>

              {/* Strength meter */}
              {mode === 'register' && passwordTouched && strength && (
                <View style={s.strengthContainer}>
                  <View style={s.strengthBar}>
                    {[1, 2, 3, 4].map(i => (
                      <View
                        key={i}
                        style={[
                          s.strengthSegment,
                          i <= strength.segments
                            ? { backgroundColor: strength.color }
                            : { backgroundColor: dark ? '#1E293B' : '#E2E8F0' },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={[s.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
                </View>
              )}
              {mode === 'register' && passwordTouched && password.length > 0 && password.length < 6 && (
                <Text style={s.errorHint}>Mínimo 6 caracteres.</Text>
              )}
            </View>

            {/* Confirm password — register only */}
            {mode === 'register' && (
              <View style={s.field}>
                <Text style={s.label}>Confirmar contraseña</Text>
                <View style={[
                  s.inputRow,
                  passwordsMatch && s.inputRowSuccess,
                  passwordsMismatch && s.inputRowError,
                ]}>
                  <Ionicons name="lock-closed-outline" size={18} color={dark ? '#475569' : '#94A3B8'} style={s.inputIcon} />
                  <TextInput
                    style={[s.input, { flex: 1 }]}
                    placeholder="Repetí la contraseña"
                    placeholderTextColor={dark ? '#475569' : '#94A3B8'}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPass}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPass(v => !v)} style={s.eyeBtn}>
                    <Ionicons name={showConfirmPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={dark ? '#475569' : '#94A3B8'} />
                  </TouchableOpacity>
                </View>
                {passwordsMatch && <Text style={s.matchSuccess}>✓ Las contraseñas coinciden</Text>}
                {passwordsMismatch && <Text style={s.matchError}>✗ Las contraseñas no coinciden</Text>}
              </View>
            )}

            <TouchableOpacity style={s.btn} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name={mode === 'login' ? 'log-in-outline' : 'person-add-outline'}
                    size={18} color="#fff"
                  />
                  <Text style={s.btnText}>{mode === 'login' ? 'Entrar' : 'Crear cuenta'}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={s.switchBtn} onPress={() => {
              resetRegisterFields();
              setMode(mode === 'login' ? 'register' : 'login');
            }}>
              <Text style={s.switchText}>
                {mode === 'login' ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Iniciá sesión'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = (dark) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: dark ? colors.background.dark : colors.background.light,
  },
  // ── Login / Register ─────────────────────────────────────────────────────
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
  // ── Verify screen ─────────────────────────────────────────────────────────
  verifyScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  verifyCard: {
    backgroundColor: dark ? colors.surface.dark : colors.surface.light,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: dark ? 0.35 : 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  verifyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  verifyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: dark ? colors.text.dark : colors.text.light,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  verifySubtitle: {
    ...typography.body,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  verifyEmail: {
    color: colors.primary,
    fontWeight: '600',
  },
  otpInput: {
    backgroundColor: dark ? '#0F172A' : '#F8FAFC',
    borderWidth: 1.5,
    borderColor: dark ? colors.border.dark : colors.border.light,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: 22,
    fontWeight: '700',
    color: dark ? colors.text.dark : colors.text.light,
    width: '100%',
  },
  otpInputError: {
    borderColor: '#EF4444',
  },
  otpError: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    textAlign: 'center',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: 6,
  },
  resendLabel: {
    ...typography.body,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
  },
  resendBtn: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15,
    paddingVertical: 4,
  },
  resendCountdown: {
    ...typography.body,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  backLinkText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  // ── Shared ───────────────────────────────────────────────────────────────
  field: {
    marginBottom: spacing.md,
    width: '100%',
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
  inputRowSuccess: {
    borderColor: '#10B981',
  },
  inputRowError: {
    borderColor: '#EF4444',
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
  strengthContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  strengthBar: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'right',
  },
  errorHint: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
  },
  matchSuccess: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 6,
  },
  matchError: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
    marginTop: 6,
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
    width: '100%',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.5,
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
