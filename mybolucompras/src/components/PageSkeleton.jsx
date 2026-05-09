import React from 'react';
import Header from './Navbar';
import '../styles/table.css';

// Anchos por columna: [th%, fila0..9%]
const SK_COLS = [
  [55, 45, 62, 38, 55, 50, 65, 42, 58, 48, 53],
  [65, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70],
  [60, 68, 72, 65, 70, 66, 73, 68, 64, 71, 67],
  [40, 45, 40, 50, 42, 48, 44, 46, 43, 49, 41],
  [55, 60, 55, 62, 58, 64, 60, 56, 63, 57, 61],
  [35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35],
  [45, 55, 60, 52, 58, 54, 62, 56, 50, 64, 59],
  [50, 50, 45, 60, 55, 48, 52, 58, 62, 46, 54],
  [60, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80],
];

function PageSkeleton() {
  return (
    <div>
      <Header />

      {/* Chips del navbar: fondos y presupuesto */}
      <div className="navbar-chips" style={{ pointerEvents: 'none' }}>
        <div className="navbar-presupuesto-chip">
          <div className="sk" style={{ width: 80, height: 12, borderRadius: 4 }} />
        </div>
        <div className="navbar-fondos-chip">
          <div className="sk" style={{ width: 110, height: 12, borderRadius: 4 }} />
        </div>
      </div>

      <div className="main-content">
        <div className="table-skeleton">

          {/* Título + botones de acción */}
          <div className="sk-header">
            <div className="sk sk-title" />
            <div className="sk-header-btns">
              <div className="sk sk-circle" />
              <div className="sk sk-circle" />
            </div>
          </div>

          {/* Tabla */}
          <div className="tabla">
            <table className="demo" style={{ pointerEvents: 'none' }}>
              <thead>
                <tr>
                  {SK_COLS.map((col, i) => (
                    <th key={i}>
                      <div className="sk sk-th" style={{ width: `${col[0]}%` }} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 10 }).map((_, ri) => (
                  <tr key={ri}>
                    {SK_COLS.map((col, ci) => (
                      <td key={ci}>
                        <div className="sk sk-td" style={{ width: `${col[ri + 1]}%` }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="footer-section">
          <div className="footer-stats">
            {[90, 70, 75].map((w, i) => (
              <div key={i} className="footer-stat">
                <div className="sk sk-footer-label" />
                <div className="sk sk-footer-value" style={{ width: w }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PageSkeleton;
