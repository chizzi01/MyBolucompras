import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

const configExtra = Constants.expoConfig?.extra ?? {};
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? configExtra.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? configExtra.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const missingSupabaseConfig = !supabaseUrl || !supabaseAnonKey;

if (missingSupabaseConfig) {
  console.error(
    'Supabase configuration is missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in Expo config or EAS secrets.'
  );
}

const missingSupabaseQuery = {
  select: () => missingSupabaseQuery,
  eq: () => missingSupabaseQuery,
  maybeSingle: async () => ({ data: null, error: new Error('Supabase is not configured.') }),
  upsert: async () => ({ data: null, error: new Error('Supabase is not configured.') }),
};

const missingSupabaseClient = {
  auth: {
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: async () => ({ error: new Error('Supabase is not configured.') }),
    signUp: async () => ({ error: new Error('Supabase is not configured.') }),
    verifyOtp: async () => ({ error: new Error('Supabase is not configured.') }),
    getUser: async () => ({ data: { user: null }, error: new Error('Supabase is not configured.') }),
    signOut: async () => ({ error: new Error('Supabase is not configured.') }),
  },
  from: () => missingSupabaseQuery,
};

export const supabase = missingSupabaseConfig
  ? missingSupabaseClient
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
