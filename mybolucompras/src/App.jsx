import React, { lazy, Suspense, useMemo } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { DataProvider } from './context/DataContext';
import { useTheme } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import UpdateNotification from './components/UpdateNotification';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import BackgroundIcons from './components/BackgroundIcons';

const LoginPage           = lazy(() => import('./pages/LoginPage'));
const RegisterPage        = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage  = lazy(() => import('./pages/ForgotPasswordPage'));
const MainPage            = lazy(() => import('./pages/MainPage'));
const Preguntas          = lazy(() => import('./components/Preguntas'));
const ConfiguracionPage  = lazy(() => import('./pages/ConfiguracionPage'));

function AppFallback() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', margin: '0 auto 16px',
          border: '3px solid #E2E8F0', borderTopColor: '#6366F1',
          animation: 'spin 0.7s linear infinite'
        }} />
        <p style={{ color: '#64748B', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14 }}>Cargando...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function App() {
  const { theme } = useTheme();

  const muiTheme = useMemo(() => createTheme({
    palette: {
      mode: theme,
      primary: { main: theme === 'dark' ? '#818CF8' : '#6366F1' },
      background: {
        default: theme === 'dark' ? '#0F172A' : '#F1F5F9',
        paper:   theme === 'dark' ? '#1E293B' : '#FFFFFF',
      },
    },
  }), [theme]);

  return (
    <MuiThemeProvider theme={muiTheme}>
      <ToastProvider>
      <BackgroundIcons />
      <Router>
        <UpdateNotification />
        <ErrorBoundary>
        <Suspense fallback={<AppFallback />}>
          <Routes>
            <Route path="/login"            element={<LoginPage />} />
            <Route path="/register"         element={<RegisterPage />} />
            <Route path="/forgot-password"  element={<ForgotPasswordPage />} />
            <Route
              path="/preguntas"
              element={
                <ProtectedRoute>
                  <DataProvider>
                    <Preguntas />
                  </DataProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DataProvider>
                    <MainPage />
                  </DataProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/configuracion"
              element={
                <ProtectedRoute>
                  <DataProvider>
                    <ConfiguracionPage />
                  </DataProvider>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </Router>
      </ToastProvider>
    </MuiThemeProvider>
  );
}

export default App;
