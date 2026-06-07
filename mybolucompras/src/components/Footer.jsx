import React from 'react';
import '../styles/dashboard.css';

function Footer({ totalGastado, tarjetaUsada, bancoUsado }) {
  const formatNumber = (number) => {
    const num = Number(number) || 0;
    return num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const renderTotales = () => {
    if (totalGastado && typeof totalGastado === 'object' && !Array.isArray(totalGastado)) {
      return Object.entries(totalGastado).map(([moneda, total]) => (
        <span key={moneda} className="footer-stat-value primary">
          {moneda}: ${formatNumber(total)}
        </span>
      ));
    }
    return <span className="footer-stat-value primary">${formatNumber(totalGastado)}</span>;
  };

  return (
    <div className="footer-compact">
      <div className="footer-compact-stats">
        <div className="footer-compact-stat">
          <span className="footer-compact-label">Total gastado</span>
          <div style={{ display: 'flex', gap: 8 }}>{renderTotales()}</div>
        </div>
        <div className="footer-compact-sep" />
        <div className="footer-compact-stat">
          <span className="footer-compact-label">Tarjeta</span>
          <span className="footer-stat-value warning">{tarjetaUsada || 'N/A'}</span>
        </div>
        <div className="footer-compact-sep" />
        <div className="footer-compact-stat">
          <span className="footer-compact-label">Banco</span>
          <span className="footer-stat-value success">{bancoUsado || 'N/A'}</span>
        </div>
        <div className="footer-compact-right">
          <span className="footer-compact-hint">
            <kbd>Esc</kbd> cierra ventanas
          </span>
          <span className="footer-compact-credit">
            <a href="https://chizzi01.github.io/Cv-React/" target="_blank" rel="noreferrer">
              Agustin Chizzini Melo
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}

export default React.memo(Footer);
