import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { DEMO_CREDENTIALS } from '../lib/demoMode';
import '../styles/auth.css';

const EyeIcon = ({ open }) =>
  open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );

function mapAuthError(message) {
  if (!message) return 'Ocurrió un error inesperado. Intentá de nuevo.';
  const msg = message.toLowerCase();
  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials') || msg.includes('wrong password'))
    return 'El email o la contraseña son incorrectos.';
  if (msg.includes('email not confirmed') || msg.includes('not confirmed'))
    return 'Confirmá tu email antes de ingresar. Revisá tu bandeja de entrada.';
  if (msg.includes('too many requests') || msg.includes('rate limit'))
    return 'Demasiados intentos fallidos. Esperá unos minutos antes de volver a intentar.';
  if (msg.includes('user not found') || msg.includes('no user'))
    return 'No existe una cuenta con ese email.';
  if (msg.includes('network') || msg.includes('fetch'))
    return 'Sin conexión. Verificá tu internet e intentá de nuevo.';
  return 'Ocurrió un error al iniciar sesión. Intentá de nuevo.';
}

export default function LoginPage() {
  const { theme } = useTheme();
  const { signIn, verifyEmail, demo } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [verifyMode, setVerifyMode] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Completá todos los campos antes de continuar.');
      return;
    }
    setLoading(true);
    try {
      await signIn(form.email, form.password);
      navigate('/');
    } catch (err) {
      if (err.message === 'VERIFY_REQUIRED') {
        setPendingEmail(form.email);
        setVerifyMode(true);
      } else {
        setError(mapAuthError(err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length < 8) {
      setOtpError('Ingresá el código de 8 dígitos.');
      return;
    }
    setLoading(true);
    try {
      await verifyEmail(pendingEmail, otp);
      navigate('/');
    } catch {
      setOtpError('Código incorrecto o expirado. Revisá tu email e intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const loginDemo = async () => {
    setLoading(true);
    try {
      await signIn(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  if (verifyMode) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <img src={theme === 'light' ? "./img/icon-light.png" : "./img/icon-bgremove.png"} alt="MyBolucompras" className="auth-logo-img" />
            <h1 className="auth-logo-title">MyBolucompras</h1>
          </div>

          <div className="auth-success-icon" style={{ background: 'var(--color-primary-light, rgba(99,102,241,0.1))', color: 'var(--color-primary)' }}>✉</div>
          <h2 className="auth-title">Verificá tu cuenta</h2>
          <p className="auth-subtitle">
            Ingresá el código de 8 dígitos que enviamos a <strong>{pendingEmail}</strong>
          </p>

          <form onSubmit={handleVerify} className="auth-form" noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="login-otp">Código de verificación</label>
              <div className="auth-input-wrapper">
                <input
                  id="login-otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  value={otp}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setOtpError(''); }}
                  placeholder="12345678"
                  className={`auth-input${otpError ? ' input-error' : ''}`}
                  autoComplete="one-time-code"
                  disabled={loading}
                  style={{ textAlign: 'center', letterSpacing: '6px', fontSize: '20px', fontWeight: '700', paddingRight: '14px' }}
                />
              </div>
              {otpError && <span className="auth-field-error">⚠ {otpError}</span>}
            </div>

            <button type="submit" className="auth-btn" disabled={loading || otp.length < 8}>
              {loading ? <span className="auth-btn-spinner" /> : 'Verificar código'}
            </button>
          </form>

          <p className="auth-footer-text">
            <button
              onClick={() => { setVerifyMode(false); setOtp(''); setOtpError(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              className="auth-link"
            >
              Volver al inicio de sesión
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src={theme === 'light' ? "./img/icon-light.png" : "./img/icon-bgremove.png"} alt="MyBolucompras" className="auth-logo-img" />
          <h1 className="auth-logo-title">MyBolucompras</h1>
        </div>

        {demo && (
          <div className="demo-banner">
            <span className="demo-banner-icon">🧪</span>
            <div>
              <strong>Modo Demo</strong>
              <p>Supabase no está configurado. Podés explorar la app con datos de muestra.</p>
            </div>
          </div>
        )}

        <h2 className="auth-title">Iniciá sesión</h2>
        <p className="auth-subtitle">Ingresá para ver tus gastos</p>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="login-email">Email</label>
            <div className="auth-input-wrapper">
              <input
                id="login-email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder={demo ? DEMO_CREDENTIALS.email : 'tu@email.com'}
                className={`auth-input${error ? ' input-error' : ''}`}
                autoComplete="email"
                disabled={loading}
              />
            </div>
          </div>

          <div className="auth-field">
            <div className="auth-label-row">
              <label className="auth-label" htmlFor="login-password">Contraseña</label>
              {!demo && (
                <Link to="/forgot-password" className="auth-forgot-link">
                  ¿Olvidaste tu contraseña?
                </Link>
              )}
            </div>
            <div className="auth-input-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder={demo ? DEMO_CREDENTIALS.password : '••••••••'}
                className={`auth-input${error ? ' input-error' : ''}`}
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                className="auth-toggle-password"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          {error && (
            <p className="auth-error" role="alert">
              <span className="auth-error-icon">⚠</span>
              {error}
            </p>
          )}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <span className="auth-btn-spinner" /> : 'Ingresar'}
          </button>

          {demo && (
            <>
              <div className="auth-divider">
                <span className="auth-divider-line" />
                <span className="auth-divider-text">o</span>
                <span className="auth-divider-line" />
              </div>
              <button
                type="button"
                className="auth-btn-demo"
                onClick={loginDemo}
                disabled={loading}
              >
                Entrar al modo demo
              </button>
            </>
          )}
        </form>

        {!demo && (
          <p className="auth-footer-text">
            ¿No tenés cuenta?{' '}
            <Link to="/register" className="auth-link">Registrate gratis</Link>
          </p>
        )}
      </div>
    </div>
  );
}
