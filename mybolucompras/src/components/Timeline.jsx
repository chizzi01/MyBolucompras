import React from 'react';
import '../App.css';

const Timeline = ({ pagosFuturos }) => {
  const months = Object.keys(pagosFuturos);

  const formatNumber = (number) => {
    return Number(number).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="timeline-container">
      {months.map((month, index) => (
        <div key={index} className="timeline-item">
          <div className="timeline-circle">{month}</div>
          <div className="timeline-payment">
            {Object.entries(pagosFuturos[month]).map(([moneda, monto]) =>
              monto > 0 ? (
                <div key={moneda}>
                  {moneda}: ${formatNumber(monto)}
                </div>
              ) : null
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Timeline;