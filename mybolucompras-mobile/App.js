import React, { useRef, useEffect } from 'react';
import {
  Animated, Easing, View, Platform, useColorScheme, AppState,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
import { ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import SpInAppUpdates, { IAUUpdateKind } from 'sp-react-native-in-app-updates';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/lib/queryClient';
import { procesarColaDeNotificaciones } from './src/services/notificacionesQueueProcessor';
import { OPENROUTER_API_KEY } from './src/config/keys';
import { useRealtimeInvalidation } from './src/hooks/useRealtimeInvalidation';
import { useGastos } from './src/hooks/queries/useGastos';
import { useConfiguracion } from './src/hooks/queries/useConfiguracion';
import { useDeudas } from './src/hooks/queries/useDeudas';
import { navigationRef } from './src/navigation/navigationRef';

const inAppUpdates = new SpInAppUpdates(false);
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DataProvider } from './src/context/DataContext';
import { DeudoresProvider } from './src/context/DeudoresContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { colors } from './src/constants/theme';

import LoginScreen from './src/screens/LoginScreen';
import BiometricLockScreen from './src/screens/BiometricLockScreen';
import GastosScreen from './src/screens/GastosScreen';
import AgregarScreen from './src/screens/AgregarScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ConfiguracionScreen from './src/screens/ConfiguracionScreen';
import OnboardingFlow from './src/screens/OnboardingFlow';
import EditarGastoScreen from './src/screens/EditarGastoModal';
import { ViajesProvider } from './src/context/ViajesContext';
import ViajesScreen from './src/screens/ViajesScreen';
import ViajeDetailScreen from './src/screens/ViajeDetailScreen';
import DeudoresScreen from './src/screens/DeudoresScreen';
import AgregarDeudaModal from './src/screens/AgregarDeudaModal';
import PendientesComprasScreen from './src/screens/PendientesComprasScreen';
import CierreChecker from './src/components/CierreChecker';
import ModoViajeChecker from './src/components/ModoViajeChecker';
import ModoPreviaTabBar from './src/components/nav/ModoPreviaTabBar';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

function RealtimeProvider({ children }) {
  useRealtimeInvalidation();
  return <>{children}</>;
}

// Evita el "flash de ceros": los datos de gastos/configuración/deudas se
// piden con react-query por pantalla, así que sin este gate el Dashboard
// llega a renderizar un frame con placeholders (fondos: 0, gastos: [])
// antes de que responda la primera carga.
function DataGate({ dark, children }) {
  const { loading: loadingGastos } = useGastos();
  const { loading: loadingConfig } = useConfiguracion();
  const { loading: loadingDeudas } = useDeudas();

  if (loadingGastos || loadingConfig || loadingDeudas) {
    return <AnimatedSplash dark={dark} />;
  }
  return children;
}


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
        source={require('./assets/BudgetBuddy.png')}
        style={{ width: 150, height: 150, borderRadius: 30, transform: [{ scale: pulse }], opacity }}
        resizeMode="contain"
      />
    </View>
  );
}

// ── Navigation ───────────────────────────────────────────────────────────────
// "Modo Previa": la barra pasa de 5 tabs a los 4 destinos reales (Gastos,
// Dashboard, Deudores, Viajes) con un "+" flotante que abre Agregar. Config
// deja de ser un tab: se abre desde el avatar de perfil en cada header.
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <ModoPreviaTabBar {...props} />}
    >
      {/* Orden pensado para el FAB central: Gastos y Viajes quedan pegados al
          "+" (tiene sentido, se usan justo antes/después de cargar un gasto);
          Inicio y Deudas van en las puntas, lejos del botón. */}
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Gastos" component={GastosScreen} />
      <Tab.Screen name="Viajes" component={ViajesScreen} />
      <Tab.Screen name="Deudores" component={DeudoresScreen} />
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
          {() => (
            <DataProvider>
              <DataGate dark={dark}>
              <CierreChecker />
              <ModoViajeChecker />
              <ViajesProvider>
              <DeudoresProvider>
                <RealtimeProvider>
                  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
                    <AuthStack.Screen name="Tabs" component={TabNavigator} />
                    <AuthStack.Screen
                      name="Agregar"
                      component={AgregarScreen}
                      options={{
                        animation: 'slide_from_bottom',
                        gestureEnabled: true,
                        gestureDirection: 'vertical',
                      }}
                    />
                    <AuthStack.Screen
                      name="Configuracion"
                      component={ConfiguracionScreen}
                      options={{ animation: 'slide_from_right' }}
                    />
                    <AuthStack.Screen
                      name="EditarGasto"
                      component={EditarGastoScreen}
                      options={{
                        animation: 'slide_from_bottom',
                        gestureEnabled: true,
                        gestureDirection: 'vertical',
                      }}
                    />
                    <AuthStack.Screen
                      name="ViajeDetail"
                      component={ViajeDetailScreen}
                      options={{ animation: 'slide_from_right' }}
                    />
                    <AuthStack.Screen
                      name="AgregarDeuda"
                      component={AgregarDeudaModal}
                      options={{
                        animation: 'slide_from_bottom',
                        gestureEnabled: true,
                        gestureDirection: 'vertical',
                      }}
                    />
                    <AuthStack.Screen
                      name="PendientesCompras"
                      component={PendientesComprasScreen}
                      options={{ animation: 'slide_from_right' }}
                    />
                    <AuthStack.Screen
                      name="EditarDeuda"
                      component={AgregarDeudaModal}
                      options={{
                        animation: 'slide_from_bottom',
                        gestureEnabled: true,
                        gestureDirection: 'vertical',
                      }}
                    />
                  </AuthStack.Navigator>
                </RealtimeProvider>
              </DeudoresProvider>
              </ViajesProvider>
              </DataGate>
            </DataProvider>
          )}
        </Stack.Screen>
      )}
    </Stack.Navigator>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const colorScheme = useColorScheme();
  const rootBg = colorScheme === 'dark' ? colors.background.dark : colors.background.light;

  const [fontsLoaded] = useFonts({
    ArchivoBlack_400Regular,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    inAppUpdates
      .checkNeedsUpdate()
      .then((result) => {
        if (result.shouldUpdate) {
          inAppUpdates.startUpdate({ updateType: IAUUpdateKind.IMMEDIATE });
        }
      })
      .catch((err) => {
        console.warn('[Update] error:', err?.message ?? err);
      });
  }, []);

  if (!fontsLoaded) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: rootBg }}>
        <AnimatedSplash dark={colorScheme === 'dark'} />
      </GestureHandlerRootView>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: rootBg }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <AuthProvider>
              <AppWithTheme />
            </AuthProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

function AppWithTheme() {
  const { dark } = useTheme();
  const responseListener = useRef();

  useEffect(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (!navigationRef.isReady()) return;
      if (data?.screen === 'Gastos') {
        navigationRef.navigate('Gastos');
      } else if (data?.screen === 'Deudores') {
        navigationRef.navigate('Deudores');
      }
    });
    return () => {
      responseListener.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const procesar = () => {
      procesarColaDeNotificaciones({ apiKey: OPENROUTER_API_KEY }).catch((err) => {
        console.warn('[Notificaciones] error al procesar la cola:', err?.message ?? err);
      });
    };

    procesar(); // por si hay pendientes de cuando la app estaba cerrada
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') procesar();
    });
    return () => subscription.remove();
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <RootNavigator />
    </NavigationContainer>
  );
}
