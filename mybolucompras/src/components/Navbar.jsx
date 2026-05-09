import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HiHome } from "react-icons/hi2";
import { FaCircleQuestion } from "react-icons/fa6";
import { FiLogOut, FiSun, FiMoon } from "react-icons/fi";
import { FaWallet } from "react-icons/fa";
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import '../styles/navbar.css';

function Header({ totalGastado, onPresupuestoClick }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const { mydata } = useData();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
  };

  const inicial = user?.user_metadata?.nombre?.[0]?.toUpperCase()
    || user?.email?.[0]?.toUpperCase()
    || '?';

  const nombre = user?.user_metadata?.nombre || user?.email || 'Usuario';

  return (
    <header>
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          <img className="navbar-logo" src="./img/icon-bgremove.png" alt="Logo" />
          <span className="navbar-name">MyBolucompras</span>
        </Link>

        <ul className="navbar-nav">
          <li className="navbar-nav-item">
            <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
              <HiHome size={17} /> Inicio
            </Link>
          </li>
          <li className="navbar-nav-item">
            <Link to="/preguntas" className={location.pathname === '/preguntas' ? 'active' : ''}>
              <FaCircleQuestion size={16} /> Ayuda
            </Link>
          </li>
        </ul>

        <div className="navbar-right">
          <button
            className="navbar-theme-btn"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark' ? <FiSun size={16} /> : <FiMoon size={16} />}
          </button>

          <div className="navbar-avatar" ref={menuRef}>
            <button
              className="navbar-avatar-btn"
              onClick={() => setMenuOpen(open => !open)}
              title={nombre}
            >
              {inicial}
            </button>

            {menuOpen && (
              <div className="navbar-avatar-menu">
                <div className="navbar-avatar-menu-header">
                  <div className="navbar-avatar-menu-name">{nombre}</div>
                  <div className="navbar-avatar-menu-email">{user?.email}</div>
                </div>
                <button className="navbar-avatar-menu-item danger" onClick={handleSignOut}>
                  <FiLogOut size={15} /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="navbar-chips">
        {mydata?.presupuestoMensualMax > 0 && totalGastado && onPresupuestoClick && (() => {
          const gastadoARS = parseFloat(totalGastado['ARS'] || 0);
          const limite = mydata.presupuestoMensualMax;
          const pct = Math.min((gastadoARS / limite) * 100, 100);
          const color = gastadoARS > limite ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#22c55e';
          return (
            <button
              className="navbar-presupuesto-chip"
              onClick={onPresupuestoClick}
              style={{ '--chip-color': color }}
              title="Ver presupuesto"
            >
              <span className="navbar-presupuesto-dot" />
              <span className="navbar-presupuesto-label">Presupuesto</span>
              <span className="navbar-presupuesto-pct">{Math.round(pct)}%</span>
            </button>
          );
        })()}
        {mydata?.fondos != null && (
          <div className="navbar-fondos-chip">
            <FaWallet size={13} />
            <span className="navbar-fondos-label">Fondos</span>
            <span
              className="navbar-fondos-value"
              style={
                Number(mydata.fondos) - parseFloat(totalGastado?.ARS || 0) < 0
                  ? { background: 'none', WebkitTextFillColor: '#ef4444', color: '#ef4444' }
                  : undefined
              }
            >
              ${(Number(mydata.fondos) - parseFloat(totalGastado?.ARS || 0))
                .toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}

export default React.memo(Header);
