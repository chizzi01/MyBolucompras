import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import '../styles/auth.css';

function mapResetError(message) {
  if (!message) return 'Ocurrió un error inesperado. Intentá de nuevo.';
  const msg = message.toLowerCase();
  if (msg.includes('rate limit') || msg.includes('too many'))
    return 'Demasiados intentos. Esperá unos minutos antes de intentar de nuevo.';
  if (msg.includes('user not found') || msg.includes('no user'))
    return 'No encontramos una cuenta con ese email.';
  if (msg.includes('network') || msg.includes('fetch'))
    return 'Sin conexión. Verificá tu internet e intentá de nuevo.';
  return 'No se pudo enviar el email. Intentá de nuevo.';
}

export default function ForgotPasswordPage() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Ingresá tu email para continuar.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/reset-password`,
      });
      if (err) throw err;
      setSent(true);
    } catch (err) {
      setError(mapResetError(err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src={theme === 'light' ? "./img/icon-light.png" : "./img/icon-bgremove.png"} alt="Bolucompras" className="auth-logo-img" />
          <h1 className="auth-logo-title">Bolucompras</h1>
        </div>

        {sent ? (
          <>
            <div className="auth-success-icon">✉</div>
            <h2 className="auth-title">Revisá tu email</h2>
            <p className="auth-subtitle" style={{ marginBottom: 24 }}>
              Te enviamos un enlace para restablecer tu contraseña a <strong>{email}</strong>. Revisá también la carpeta de spam.
            </p>
            <Link to="/login" className="auth-btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 0 }}>
              Volver al inicio de sesión
            </Link>
          </>
        ) : (
          <>
            <h2 className="auth-title">Recuperar contraseña</h2>
            <p className="auth-subtitle">
              Ingresá tu email y te enviaremos un enlace para restablecer tu contraseña.
            </p>

            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              <div className="auth-field">
                <label className="auth-label" htmlFor="reset-email">Email</label>
                <div className="auth-input-wrapper">
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder="tu@email.com"
                    className={`auth-input${error ? ' input-error' : ''}`}
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <p className="auth-error" role="alert">
                  <span className="auth-error-icon">⚠</span>
                  {error}
                </p>
              )}

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? <span className="auth-btn-spinner" /> : 'Enviar enlace'}
              </button>
            </form>

            <p className="auth-footer-text">
              <Link to="/login" className="auth-link">← Volver al inicio de sesión</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
