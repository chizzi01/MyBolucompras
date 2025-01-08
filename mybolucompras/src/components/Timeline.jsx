import React from 'react';
import '../App.css';

const Timeline = ({ pagosFuturos }) => {
  const months = Object.keys(pagosFuturos);
  const payments = Object.values(pagosFuturos);
  const formatNumber = (number) => {
    return number.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  return (
    <div className="timeline-container">
      {months.map((month, index) => (
        <div key={index} className="timeline-item">
          <div className="timeline-circle">{month}</div>
          <div className="timeline-payment">${formatNumber(payments[index])}</div>
        </div>
      ))}
    </div>
  );
};

export default Timeline;