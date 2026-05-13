import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { supabase } from '../lib/supabase';

const BIOMETRIC_KEY = 'biometric_enabled';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [appLocked, setAppLocked] = useState(false);

  const [onboardingNeeded, setOnboardingNeeded] = useState(false);

  useEffect(() => {
    LocalAuthentication.hasHardwareAsync().then(has => {
      if (!has) return;
      LocalAuthentication.isEnrolledAsync().then(enrolled => {
        setBiometricAvailable(enrolled);
      });
    });

    const init = async () => {
      try {
        const [{ data: { session } }, bioStored] = await Promise.all([
          supabase.auth.getSession(),
          AsyncStorage.getItem(BIOMETRIC_KEY),
        ]);

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Check if user already has data in DB
          const { data: config, error } = await supabase
            .from('configuracion_usuario')
            .select('fondos, etiquetas, cierre, vencimiento, moneda_preferida')
            .eq('user_id', session.user.id)
            .maybeSingle();
          
          console.log('DEBUG: Onboarding check for', session.user.email, config);
          if (error) console.error('DEBUG: Onboarding error', error);

          const alreadyHasData = config && (
            Number(config.fondos) > 0 || 
            (Array.isArray(config.etiquetas) && config.etiquetas.length > 0) ||
            config.cierre ||
            config.vencimiento ||
            (config.moneda_preferida && config.moneda_preferida !== 'ARS')
          );
          
          console.log('DEBUG: alreadyHasData?', alreadyHasData);

          if (!alreadyHasData) {
            setOnboardingNeeded(true);
          }
        }

        const bioOn = bioStored === 'true';
        setBiometricEnabledState(bioOn);
        if (session?.user && bioOn) {
          setAppLocked(true);
        }
      } catch (error) {
        console.error('Failed to initialize authentication', error);
      } finally {
        setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(prev => {
        const next = session?.user ?? null;
        if (next && prev?.id !== next.id) {
          // Check onboarding for new user session
          supabase.from('configuracion_usuario')
            .select('fondos, etiquetas, cierre, vencimiento, moneda_preferida')
            .eq('user_id', next.id)
            .maybeSingle()
            .then(({ data }) => {
              const alreadyHasData = data && (
                Number(data.fondos) > 0 || 
                (Array.isArray(data.etiquetas) && data.etiquetas.length > 0) ||
                data.cierre ||
                data.vencimiento ||
                (data.moneda_preferida && data.moneda_preferida !== 'ARS')
              );
              if (!alreadyHasData) setOnboardingNeeded(true);
            });
        }
        return prev?.id === next?.id ? prev : next;
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Email not confirmed')) {
        throw new Error('VERIFY_REQUIRED');
      }
      throw error;
    }
  };

  const signUp = async (email, password, nombre) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: { nombre },
        emailRedirectTo: null // We want OTP, not magic link redirection necessarily
      },
    });
    
    if (error) throw error;
    
    // If user is returned but identities is empty, it means user already exists (if Supabase is configured this way)
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      throw new Error('USER_ALREADY_EXISTS');
    }
  };

  const verifyEmail = async (email, token) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });
    if (error) throw error;
  };

  const resendCode = async (email) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    if (error) throw error;
  };

  const completeOnboarding = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('configuracion_usuario')
      .upsert({ user_id: user.id, onboarding_completed: true });
    setOnboardingNeeded(false);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setAppLocked(false);
    setOnboardingNeeded(false);
  };

  const enableBiometric = async (val) => {
    await AsyncStorage.setItem(BIOMETRIC_KEY, val ? 'true' : 'false');
    setBiometricEnabledState(val);
  };

  const unlockApp = () => setAppLocked(false);

  const authenticateWithBiometrics = () =>
    LocalAuthentication.authenticateAsync({
      promptMessage: 'Verificá tu identidad',
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false,
    });

  return (
    <AuthContext.Provider value={{
      user, session, loading,
      signIn, signUp, signOut, verifyEmail, resendCode,
      onboardingNeeded, completeOnboarding,
      biometricEnabled, biometricAvailable, enableBiometric,
      appLocked, unlockApp, authenticateWithBiometrics,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
