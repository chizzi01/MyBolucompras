import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isDemoMode, DEMO_CREDENTIALS, DEMO_USER } from '../lib/demoMode';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const demo = isDemoMode();

  useEffect(() => {
    if (demo) {
      // En demo mode, revisar si hay sesión demo guardada
      const savedDemo = sessionStorage.getItem('demo_session');
      if (savedDemo) {
        setUser(DEMO_USER);
        setSession({ user: DEMO_USER });
      }
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(prev => {
        const next = session?.user ?? null;
        // Si es el mismo usuario (token refresh), mantener la misma referencia
        return prev?.id === next?.id ? prev : next;
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    if (demo) {
      if (email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
        sessionStorage.setItem('demo_session', '1');
        setUser(DEMO_USER);
        setSession({ user: DEMO_USER });
        return;
      }
      throw new Error('Credenciales incorrectas. Usá las del modo demo.');
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email, password, nombre) => {
    if (demo) throw new Error('El registro no está disponible en modo demo.');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre } },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    if (demo) {
      sessionStorage.removeItem('demo_session');
      setUser(null);
      setSession(null);
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, demo }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
