import React from 'react';
import Header from './Navbar';
import '../styles/table.css';

// Shimmer blanco para el thead púrpura de .demo
const ThSk = ({ style }) => (
  <div
    style={{
      borderRadius: 4,
      backgroundImage:
        'linear-gradient(90deg,rgba(255,255,255,0.18) 25%,rgba(255,255,255,0.36) 50%,rgba(255,255,255,0.18) 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-shimmer 1.4s infinite',
      margin: '0 auto',
      ...style,
    }}
  />
);

// [th%, row0..7%] por columna: Objeto, Fecha, Medio, Cuotas, Banco, Cantidad, Precio, Etiqueta
const COLS = [
  [65, 72, 55, 82, 65, 74, 60, 78, 70],
  [70, 82, 82, 82, 82, 82, 82, 82, 82],
  [70, 85, 68, 88, 75, 82, 68, 88, 75],
  [65, 45, 35, 55, 42, 48, 35, 52, 42],
  [60, 78, 82, 70, 85, 72, 80, 68, 78],
  [65, 40, 30, 52, 35, 48, 30, 50, 38],
  [60, 72, 68, 75, 68, 72, 68, 75, 68],
  [65, 62, 55, 68, 72, 58, 64, 70, 60],
];

const ROWS = 8;

function PageSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />

      {/* Chips fijos debajo del navbar */}
      <div className="navbar-chips" style={{ pointerEvents: 'none' }}>
        <div className="navbar-presupuesto-chip" style={{ cursor: 'default' }}>
          <div className="sk" style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0 }} />
          <div className="sk" style={{ width: 68, height: 10, borderRadius: 4 }} />
          <div className="sk" style={{ width: 26, height: 10, borderRadius: 4 }} />
        </div>
        <div className="navbar-fondos-chip" style={{ cursor: 'default' }}>
          <div className="sk" style={{ width: 13, height: 13, borderRadius: 3 }} />
          <div className="sk" style={{ width: 38, height: 10, borderRadius: 4 }} />
          <div className="sk" style={{ width: 72, height: 12, borderRadius: 4 }} />
        </div>
      </div>

      {/*
        main-content: flex column para que el footer siempre quede al final.
        padding-top igual al real (navbar-height + space-6).
      */}
      <div
        className="main-content"
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
      >
        <section id="gastos" style={{ flex: 1 }}>

          {/*
            Cabecera: replica .componentContainer SIN el min-height:100vh.
            - título centrado (h1: font-size 40px, padding 20px → bloque ~88px)
            - dos botones circulares 50×50 a la izquierda, mismos tamaños que
              .dropbtn y .dropbtnFilter. Margin 20px idéntico al real.
            No se usa position:relative con top offset para evitar que el botón
            de filtros se desborde visualmente sobre la tabla.
          */}
          <div style={{ width: '100%', paddingTop: 10 }}>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div
                className="sk"
                style={{ height: 48, width: 310, borderRadius: 6, display: 'inline-block' }}
              />
            </div>
            {/* Botones: add (verde) + filter (azul), ambos 50×50 con margin 20px */}
            <div style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: 0 }}>
              <div className="sk" style={{ width: 50, height: 50, borderRadius: '100%', margin: 20, flexShrink: 0 }} />
              <div className="sk" style={{ width: 50, height: 50, borderRadius: '50%', margin: 20, flexShrink: 0 }} />
            </div>
          </div>

          {/*
            Tabla: usa .tabla (height:60vh, overflow:scroll, padding:20px)
            y table.demo (thead púrpura, tr height:50px, td padding:10px).
          */}
          <div className="tabla">
            <table className="demo" style={{ pointerEvents: 'none' }}>
              <thead>
                <tr>
                  {COLS.map((col, i) => (
                    <th key={i}>
                      <ThSk style={{ height: 12, width: `${col[0]}%` }} />
                    </th>
                  ))}
                  <th>
                    <ThSk style={{ height: 12, width: '65%' }} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: ROWS }).map((_, ri) => (
                  <tr key={ri}>
                    {COLS.map((col, ci) => (
                      <td key={ci}>
                        {ci === 7 ? (
                          <div className="sk sk-pill" style={{ width: `${col[ri + 1]}%` }} />
                        ) : (
                          <div className="sk sk-td" style={{ width: `${col[ri + 1]}%` }} />
                        )}
                      </td>
                    ))}
                    {/* Edit (75×32px) + Delete (75×32px): idénticos a .edit-btn / .delete-btn */}
                    <td>
                      <div className="buttonsActionsAlign">
                        <div className="sk" style={{ width: 75, height: 32, borderRadius: 60, flexGrow: 1, margin: '0 10px' }} />
                        <div className="sk" style={{ width: 75, height: 32, borderRadius: 60, flexGrow: 1, margin: '0 10px' }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer siempre al final gracias al flex column del outer div */}
        <div className="footer-section">
          <div className="footer-stats">
            {[[85, 115], [78, 72], [80, 78], [50, 95]].map(([lw, vw], i) => (
              <div key={i} className="footer-stat">
                <div className="sk" style={{ height: 14, width: lw, borderRadius: 4, marginBottom: 4 }} />
                <div className="sk" style={{ height: 19, width: vw, borderRadius: 4 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PageSkeleton;
