import React, { useRef, useEffect } from 'react';
import {
  Animated, Easing, View, Platform,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import SpInAppUpdates, { IAUUpdateKind } from 'sp-react-native-in-app-updates';

const inAppUpdates = new SpInAppUpdates(false);
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DataProvider } from './src/context/DataContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { colors } from './src/constants/theme';

import LoginScreen from './src/screens/LoginScreen';
import BiometricLockScreen from './src/screens/BiometricLockScreen';
import GastosScreen from './src/screens/GastosScreen';
import AgregarScreen from './src/screens/AgregarScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ConfiguracionScreen from './src/screens/ConfiguracionScreen';
import OnboardingFlow from './src/screens/OnboardingFlow';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();


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
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    inAppUpdates
      .checkNeedsUpdate()
      .then((result) => {
        if (result.isAvailable) {
          inAppUpdates.startUpdateFlow(IAUUpdateKind.IMMEDIATE);
        }
      })
      .catch((err) => {
        console.warn('[Update] error:', err?.message ?? err);
      });
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppWithTheme />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppWithTheme() {
  const { dark } = useTheme();
  return (
    <NavigationContainer>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <RootNavigator />
    </NavigationContainer>
  );
}
