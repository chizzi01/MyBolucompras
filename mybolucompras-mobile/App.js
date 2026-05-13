import React, { useRef, useEffect, useState } from 'react';
import {
  Animated, Easing, View, Platform, Modal,
  Text, TouchableOpacity, Image, StyleSheet, Linking,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import SpInAppUpdates, { IAUUpdateKind } from 'sp-react-native-in-app-updates';

import { supabase } from './src/lib/supabase';

const inAppUpdates = new SpInAppUpdates(false);
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DataProvider } from './src/context/DataContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { colors, spacing, radius, typography } from './src/constants/theme';

import LoginScreen from './src/screens/LoginScreen';
import BiometricLockScreen from './src/screens/BiometricLockScreen';
import GastosScreen from './src/screens/GastosScreen';
import AgregarScreen from './src/screens/AgregarScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ConfiguracionScreen from './src/screens/ConfiguracionScreen';
import OnboardingFlow from './src/screens/OnboardingFlow';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Mirrors android.versionCode in app.json / build.gradle
const CURRENT_VERSION_CODE = Constants.expoConfig?.android?.versionCode ?? 1;
const APP_ID = 'com.chizzi.mybolucomprasmobile';

// ── Update modal ─────────────────────────────────────────────────────────────
function UpdateModal({ visible, dark }) {
  const s = updateStyles(dark);

  const openStore = async () => {
    const market = `market://details?id=${APP_ID}`;
    const web = `https://play.google.com/store/apps/details?id=${APP_ID}`;
    const canOpen = await Linking.canOpenURL(market).catch(() => false);
    Linking.openURL(canOpen ? market : web).catch(() => Linking.openURL(web));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.card}>
          <Image
            source={require('./assets/MyBolucompras.png')}
            style={s.logo}
            resizeMode="contain"
          />
          <View style={s.badgeRow}>
            <Ionicons name="arrow-up-circle" size={18} color="#fff" />
            <Text style={s.badge}>Actualización disponible</Text>
          </View>
          <Text style={s.title}>Nueva versión disponible</Text>
          <Text style={s.body}>
            Para seguir usando MyBolucompras necesitás actualizar la app a la última versión.
          </Text>
          <TouchableOpacity style={s.btn} onPress={openStore} activeOpacity={0.85}>
            <Ionicons name="logo-google-playstore" size={20} color="#fff" />
            <Text style={s.btnText}>Actualizar en Play Store</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const updateStyles = (dark) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: dark ? colors.surface.dark : colors.surface.light,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 20,
    marginBottom: spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: spacing.md,
  },
  badge: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: dark ? colors.text.dark : colors.text.light,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: 14,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: spacing.xl,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});

// ── Animated splash ──────────────────────────────────────────────────────────
function AnimatedSplash({ dark }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulse, { toValue: 1.12, duration: 950, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 950, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulse, { toValue: 0.88, duration: 950, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.7, duration: 950, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, [pulse, opacity]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: dark ? colors.background.dark : colors.background.light }}>
      <Animated.Image
        source={require('./assets/MyBolucompras.png')}
        style={{ width: 150, height: 150, borderRadius: 30, transform: [{ scale: pulse }], opacity }}
        resizeMode="contain"
      />
    </View>
  );
}

// ── Navigation ───────────────────────────────────────────────────────────────
function TabNavigator() {
  const { dark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: dark ? colors.tabBar.dark : colors.tabBar.light,
          borderTopColor: dark ? colors.border.dark : colors.border.light,
          borderTopWidth: 1,
          paddingBottom: insets.bottom + 4,
          height: 56 + insets.bottom,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: dark ? '#475569' : '#94A3B8',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500', marginBottom: 2 },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Gastos: focused ? 'list' : 'list-outline',
            Agregar: focused ? 'add-circle' : 'add-circle-outline',
            Dashboard: focused ? 'bar-chart' : 'bar-chart-outline',
            Configuracion: focused ? 'settings' : 'settings-outline',
          };
          return <Ionicons name={icons[route.name]} size={route.name === 'Agregar' ? 28 : size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Gastos" component={GastosScreen} />
      <Tab.Screen name="Agregar" component={AgregarScreen} options={{ tabBarLabel: 'Agregar', tabBarIconStyle: { marginTop: -2 } }} />
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Configuracion" component={ConfiguracionScreen} options={{ tabBarLabel: 'Config' }} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, loading, appLocked, onboardingNeeded } = useAuth();
  const { dark } = useTheme();

  if (loading) return <AnimatedSplash dark={dark} />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : appLocked ? (
        <Stack.Screen name="Lock" component={BiometricLockScreen} />
      ) : onboardingNeeded ? (
        <Stack.Screen name="Onboarding">
          {() => (<DataProvider><OnboardingFlow /></DataProvider>)}
        </Stack.Screen>
      ) : (
        <Stack.Screen name="Main">
          {() => (<DataProvider><TabNavigator /></DataProvider>)}
        </Stack.Screen>
      )}
    </Stack.Navigator>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [updateRequired, setUpdateRequired] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    // 1. Native Play Store in-app update (requires app installed from Play Store
    //    AND a newer versionCode published — works once this build is live on store)
    inAppUpdates
      .checkNeedsUpdate()
      .then((result) => {
        if (result.isAvailable) {
          inAppUpdates.startUpdateFlow(IAUUpdateKind.FLEXIBLE);
        }
      })
      .catch(() => {});

    // 2. Supabase remote config check — works in any build/environment.
    //    Set min_version_code > CURRENT_VERSION_CODE in Supabase to force update.
    supabase
      .from('remote_config')
      .select('value')
      .eq('key', 'min_version_code')
      .maybeSingle()
      .then(({ data }) => {
        if (data && Number(data.value) > CURRENT_VERSION_CODE) {
          setUpdateRequired(true);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppWithTheme updateRequired={updateRequired} />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppWithTheme({ updateRequired }) {
  const { dark } = useTheme();
  return (
    <NavigationContainer>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <RootNavigator />
      <UpdateModal visible={updateRequired} dark={dark} />
    </NavigationContainer>
  );
}
