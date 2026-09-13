// "Modo Previa": fondo casi negro con números grandes en Archivo Black para el
// tema oscuro, y un equivalente cálido (no el slate frío anterior) para el claro.
// Índigo/verde de marca se mantienen iguales en los dos modos.
export const colors = {
  primary: '#6366F1',
  primaryLight: '#818CF8',
  accent: '#10B981',
  accentGlow: '#34D399',
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  info: '#3B82F6',
  background: {
    light: '#FBF8F3',
    dark: '#0B0A10',
  },
  surface: {
    light: '#FFFFFF',
    dark: '#18151F',
  },
  surfaceSecondary: {
    light: '#F3EEE4',
    dark: '#1F1B2B',
  },
  text: {
    light: '#211D2E',
    dark: '#F3F1FA',
  },
  textSecondary: {
    light: '#726C87',
    dark: '#9691B0',
  },
  border: {
    light: '#E8E1D3',
    dark: '#2A2740',
  },
  tabBar: {
    light: '#FFFFFF',
    dark: '#18151F',
  },
  glow: {
    light: 'rgba(99,102,241,0.18)',
    dark: 'rgba(129,140,248,0.5)',
  },
};

// Nombres de familia tal como los exportan los paquetes @expo-google-fonts/*
// una vez cargados con useFonts en App.js.
export const fonts = {
  display: 'ArchivoBlack_400Regular', // números grandes: hero, KPIs, totales
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

// Alto aproximado de la píldora flotante de ModoPreviaTabBar (sin contar el
// inset del home indicator, que cada pantalla suma aparte vía useSafeAreaInsets).
// Se usa como paddingBottom en scrolls/listas para que el último item no quede tapado.
export const TAB_BAR_CLEARANCE = 90;

export const radius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  h1: { fontSize: 28, fontFamily: fonts.bold },
  h2: { fontSize: 22, fontFamily: fonts.bold },
  h3: { fontSize: 18, fontFamily: fonts.semibold },
  body: { fontSize: 15, fontFamily: fonts.regular },
  bodyMed: { fontSize: 15, fontFamily: fonts.medium },
  bodyBold: { fontSize: 15, fontFamily: fonts.bold },
  caption: { fontSize: 12, fontFamily: fonts.regular },
  captionMed: { fontSize: 12, fontFamily: fonts.medium },
  // números grandes tipo "Modo Previa" — hero, KPIs, totales
  display: { fontSize: 34, fontFamily: fonts.display },
  displaySm: { fontSize: 22, fontFamily: fonts.display },
};
