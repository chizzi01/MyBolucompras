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

  useEffect(() => {
    LocalAuthentication.hasHardwareAsync().then(has => {
      if (!has) return;
      LocalAuthentication.isEnrolledAsync().then(enrolled => {
        setBiometricAvailable(enrolled);
      });
    });

    const init = async () => {
      const [{ data: { session } }, bioStored] = await Promise.all([
        supabase.auth.getSession(),
        AsyncStorage.getItem(BIOMETRIC_KEY),
      ]);

      setSession(session);
      setUser(session?.user ?? null);

      const bioOn = bioStored === 'true';
      setBiometricEnabledState(bioOn);
      if (session?.user && bioOn) {
        setAppLocked(true);
      }

      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(prev => {
        const next = session?.user ?? null;
        return prev?.id === next?.id ? prev : next;
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email, password, nombre) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre } },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setAppLocked(false);
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
      signIn, signUp, signOut,
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
