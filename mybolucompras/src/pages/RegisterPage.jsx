import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BANCOS, MEDIOS_DE_PAGO, MONEDAS } from '../constants/catalogos';
import '../styles/auth.css';
import '../styles/configuracion.css';

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

function getPasswordStrength(password) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 6)  score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 'weak',   label: 'Muy débil',  segments: 1 };
  if (score === 2) return { level: 'fair',   label: 'Débil',      segments: 2 };
  if (score === 3) return { level: 'good',   label: 'Aceptable',  segments: 3 };
  return             { level: 'strong', label: 'Segura',     segments: 4 };
}

function mapAuthError(message) {
  if (!message) return 'Ocurrió un error inesperado. Intentá de nuevo.';
  const msg = message.toLowerCase();
  if (msg.includes('already registered') || msg.includes('user already exists') || msg.includes('email address already used'))
    return 'Ya existe una cuenta con ese email. ¿Querés iniciar sesión?';
  if (msg.includes('password should be') || msg.includes('password is too short'))
    return 'La contraseña debe tener al menos 6 caracteres.';
  if (msg.includes('invalid email') || msg.includes('email address is invalid'))
    return 'El email ingresado no es válido.';
  if (msg.includes('network') || msg.includes('fetch'))
    return 'Sin conexión. Verificá tu internet e intentá de nuevo.';
  return 'No se pudo crear la cuenta. Intentá de nuevo.';
}

export default function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: '', email: '', password: '', confirm: '' });
  const [touched, setTouched] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [bancosSeleccionados, setBancosSeleccionados] = useState([]);
  const [mediosSeleccionados, setMediosSeleccionados] = useState([]);
  const [monedaPreferida, setMonedaPreferida] = useState('ARS');

  const strength = useMemo(() => getPasswordStrength(form.password), [form.password]);

  const fieldErrors = useMemo(() => {
    const errs = {};
    if (touched.nombre && !form.nombre.trim()) errs.nombre = 'Ingresá tu nombre.';
    if (touched.email && !form.email) errs.email = 'Ingresá tu email.';
    if (touched.password && form.password && form.password.length < 6)
      errs.password = 'Mínimo 6 caracteres.';
    return errs;
  }, [form, touched]);

  const passwordsMatch = form.confirm.length > 0 && form.password === form.confirm;
  const passwordsMismatch = form.confirm.length > 0 && form.password !== form.confirm;

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleBlur = (e) => {
    setTouched(prev => ({ ...prev, [e.target.name]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ nombre: true, email: true, password: true, confirm: true });

    if (!form.nombre || !form.email || !form.password || !form.confirm) {
      setError('Completá todos los campos antes de continuar.');
      return;
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Las contraseñas no coinciden. Verificalas e intentá de nuevo.');
      return;
    }
    setLoading(true);
    try {
      await signUp(form.email, form.password, form.nombre);
      setStep(2);
    } catch (err) {
      setError(mapAuthError(err.message));
    } finally {
      setLoading(false);
    }
  };

  const toggleBanco = (banco) => {
    setBancosSeleccionados(prev =>
      prev.includes(banco) ? prev.filter(b => b !== banco) : [...prev, banco]
    );
  };

  const toggleMedio = (medio) => {
    setMediosSeleccionados(prev =>
      prev.includes(medio) ? prev.filter(m => m !== medio) : [...prev, medio]
    );
  };

  const handleSaveConfig = () => {
    const pendingConfig = {
      bancosHabilitados: bancosSeleccionados,
      mediosHabilitados: mediosSeleccionados,
      monedaPreferida,
    };
    localStorage.setItem(`pendingConfig_${form.email}`, JSON.stringify(pendingConfig));
    navigate('/login');
  };

  const handleSkip = () => {
    navigate('/login');
  };

  if (step === 2) {
    return (
      <div className="auth-page" style={{ alignItems: 'flex-start', paddingTop: 40 }}>
        <div className="auth-card" style={{ maxWidth: 580 }}>
          <div className="auth-logo">
            <img src="./img/icon-bgremove.png" alt="Bolucompras" className="auth-logo-img" />
            <h1 className="auth-logo-title">Bolucompras</h1>
          </div>

          <div className="auth-success-icon">✓</div>
          <h2 className="auth-title">¡Cuenta creada con éxito!</h2>
          <p className="auth-subtitle" style={{ marginBottom: 24 }}>
            Te enviamos un email de confirmación. Mientras tanto, configurá tus preferencias para personalizar la app.
          </p>

          <div className="setup-section">
            <div className="setup-section-title">Bancos que usás</div>
            <div className="config-chips">
              {BANCOS.map(banco => (
                <button
                  key={banco}
                  className={`config-chip${bancosSeleccionados.includes(banco) ? ' active' : ''}`}
                  onClick={() => toggleBanco(banco)}
                  type="button"
                >
                  {banco}
                </button>
              ))}
            </div>
          </div>

          <div className="setup-section">
            <div className="setup-section-title">Medios de pago</div>
            <div className="config-chips">
              {MEDIOS_DE_PAGO.map(medio => (
                <button
                  key={medio}
                  className={`config-chip${mediosSeleccionados.includes(medio) ? ' active' : ''}`}
                  onClick={() => toggleMedio(medio)}
                  type="button"
                >
                  {medio}
                </button>
              ))}
            </div>
          </div>

          <div className="setup-section">
            <div className="setup-section-title">Moneda preferida</div>
            <div className="config-chips">
              {MONEDAS.map(m => (
                <button
                  key={m.code}
                  className={`config-chip${monedaPreferida === m.code ? ' active' : ''}`}
                  onClick={() => setMonedaPreferida(m.code)}
                  type="button"
                >
                  {m.symbol} {m.label}
                </button>
              ))}
            </div>
          </div>

          <button className="auth-btn" onClick={handleSaveConfig} style={{ marginTop: 24 }}>
            Guardar y continuar
          </button>
          <p className="auth-footer-text" style={{ marginTop: 12 }}>
            <button
              onClick={handleSkip}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              className="auth-link"
            >
              Saltar por ahora
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
          <img src="./img/icon-bgremove.png" alt="Bolucompras" className="auth-logo-img" />
          <h1 className="auth-logo-title">Bolucompras</h1>
        </div>

        <h2 className="auth-title">Crear cuenta</h2>
        <p className="auth-subtitle">Registrate para empezar a gestionar tus gastos</p>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-nombre">Nombre</label>
            <div className="auth-input-wrapper">
              <input
                id="reg-nombre"
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Tu nombre"
                className={`auth-input${fieldErrors.nombre ? ' input-error' : ''}`}
                autoComplete="name"
                disabled={loading}
              />
            </div>
            {fieldErrors.nombre && (
              <span className="auth-field-error">⚠ {fieldErrors.nombre}</span>
            )}
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-email">Email</label>
            <div className="auth-input-wrapper">
              <input
                id="reg-email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="tu@email.com"
                className={`auth-input${fieldErrors.email ? ' input-error' : ''}`}
                autoComplete="email"
                disabled={loading}
              />
            </div>
            {fieldErrors.email && (
              <span className="auth-field-error">⚠ {fieldErrors.email}</span>
            )}
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-password">Contraseña</label>
            <div className="auth-input-wrapper">
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Mínimo 6 caracteres"
                className={`auth-input${fieldErrors.password ? ' input-error' : ''}`}
                autoComplete="new-password"
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
            {fieldErrors.password && (
              <span className="auth-field-error">⚠ {fieldErrors.password}</span>
            )}
            {strength && !fieldErrors.password && (
              <div className="auth-strength">
                <div className="auth-strength-bar">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className={`auth-strength-segment${i <= strength.segments ? ` filled ${strength.level}` : ''}`}
                    />
                  ))}
                </div>
                <span className={`auth-strength-label ${strength.level}`}>{strength.label}</span>
              </div>
            )}
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-confirm">Confirmar contraseña</label>
            <div className="auth-input-wrapper">
              <input
                id="reg-confirm"
                type={showConfirm ? 'text' : 'password'}
                name="confirm"
                value={form.confirm}
                onChange={handleChange}
                placeholder="Repetí la contraseña"
                className={`auth-input${passwordsMismatch ? ' input-error' : passwordsMatch ? ' input-success' : ''}`}
                autoComplete="new-password"
                disabled={loading}
              />
              <button
                type="button"
                className="auth-toggle-password"
                onClick={() => setShowConfirm(v => !v)}
                tabIndex={-1}
                aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                <EyeIcon open={showConfirm} />
              </button>
            </div>
            {passwordsMatch && (
              <span className="auth-password-match match">✓ Las contraseñas coinciden</span>
            )}
            {passwordsMismatch && (
              <span className="auth-password-match no-match">✗ Las contraseñas no coinciden</span>
            )}
          </div>

          {error && (
            <p className="auth-error" role="alert">
              <span className="auth-error-icon">⚠</span>
              {error}
              {error.includes('¿Querés iniciar sesión?') && (
                <> <Link to="/login" className="auth-link" style={{ display: 'inline', fontSize: 'inherit' }}>Iniciá sesión</Link></>
              )}
            </p>
          )}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <span className="auth-btn-spinner" /> : 'Crear cuenta'}
          </button>
        </form>

        <p className="auth-footer-text">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="auth-link">Iniciá sesión</Link>
        </p>
      </div>
    </div>
  );
}
