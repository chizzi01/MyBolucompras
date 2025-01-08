import React from 'react';
import '../App.css';

const Timeline = ({ pagosFuturos }) => {
  const months = Object.keys(pagosFuturos);
  const payments = Object.values(pagosFuturos);

  return (
    <div className="timeline-container">
      {months.map((month, index) => (
        <div key={index} className="timeline-item">
          <div className="timeline-circle">{month}</div>
          <div className="timeline-payment">${payments[index].toFixed(2)}</div>
        </div>
      ))}
    </div>
  );
};

export default Timeline;