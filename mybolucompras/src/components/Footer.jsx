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
    <div className="footer-section">
      <div className="footer-stats">
        <div className="footer-stat">
          <span className="footer-stat-label">Total gastado</span>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{renderTotales()}</div>
        </div>

        <div className="footer-stat">
          <span className="footer-stat-label">Medio más usado</span>
          <span className="footer-stat-value warning">{tarjetaUsada || 'N/A'}</span>
        </div>

        <div className="footer-stat">
          <span className="footer-stat-label">Banco más usado</span>
          <span className="footer-stat-value success">{bancoUsado || 'N/A'}</span>
        </div>

        <div className="footer-stat">
          <span className="footer-stat-label">Atajo</span>
          <span className="footer-stat-value" style={{ fontSize: 12, opacity: 0.75 }}>
            <kbd style={{ fontFamily: 'inherit', background: 'rgba(0,0,0,0.08)', borderRadius: 4, padding: '1px 5px' }}>Esc</kbd> cierra ventanas
          </span>
        </div>

        <div className="footer-credit">
          Powered by{' '}
          <a href="https://chizzi01.github.io/Cv-React/" target="_blank" rel="noreferrer">
            Agustin Chizzini Melo
          </a>
        </div>
      </div>
    </div>
  );
}

export default React.memo(Footer);
