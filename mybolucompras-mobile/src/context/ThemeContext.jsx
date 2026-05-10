import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext(null);
const STORAGE_KEY = '@bolucompras_theme';

export function ThemeProvider({ children }) {
  const system = useColorScheme();
  const [mode, setMode] = useState('system'); // 'light' | 'dark' | 'system'

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(v => {
      if (v === 'light' || v === 'dark' || v === 'system') setMode(v);
    });
  }, []);

  const setTheme = async (m) => {
    setMode(m);
    await AsyncStorage.setItem(STORAGE_KEY, m);
  };

  const dark = mode === 'system' ? system === 'dark' : mode === 'dark';

  return (
    <ThemeContext.Provider value={{ dark, mode, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return ctx;
}
