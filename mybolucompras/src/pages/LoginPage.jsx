import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DEMO_CREDENTIALS } from '../lib/demoMode';
import '../styles/auth.css';

export default function LoginPage() {
  const { signIn, demo } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Completá todos los campos.');
      return;
    }
    setLoading(true);
    try {
      await signIn(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Email o contraseña incorrectos.');
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

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="./img/icon-bgremove.png" alt="MyBolucompras" className="auth-logo-img" />
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

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder={demo ? DEMO_CREDENTIALS.email : 'tu@email.com'}
              className="auth-input"
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Contraseña</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder={demo ? DEMO_CREDENTIALS.password : '••••••••'}
              className="auth-input"
              autoComplete="current-password"
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <span className="auth-btn-spinner" /> : 'Ingresar'}
          </button>

          {demo && (
            <button
              type="button"
              className="auth-btn-demo"
              onClick={loginDemo}
              disabled={loading}
            >
              Entrar al modo demo
            </button>
          )}
        </form>

        {!demo && (
          <p className="auth-footer-text">
            ¿No tenés cuenta?{' '}
            <Link to="/register" className="auth-link">Registrate</Link>
          </p>
        )}
      </div>
    </div>
  );
}
