import React from 'react';
import Header from './Navbar';
import '../styles/table.css';
import '../styles/viajes.css';

/*
  Réplica fiel de ViajeDetallePage usando las mismas clases CSS y tamaños exactos:
  - .viaje-hero:          min-height 340px, gradiente púrpura
  - .viaje-hero-btn:      36×36px, border-radius 50%
  - .viaje-hero-emoji-box: 56×56px, border-radius 14px
  - .viaje-hero-titulo:   font-size 28px → ~34px
  - .viaje-hero-badge:    padding 4px 12px + font 12px → ~24px
  - .viaje-hero-avatar:   30×30px, border-radius 50%
  - .viaje-stat-card:     padding 12px 16px, border-radius 14px
    - label: font-size 10px → ~12px
    - value: font-size 20px → ~24px
    - sub:   font-size 11px → ~13px
  - .viaje-seg-tabs:      pill container, padding 3px
  - .viaje-seg-btn:       flex 1, padding 8px 12px, font 13px → ~36px
*/

// Shimmer blanco para usar sobre el fondo oscuro del hero
const HeroSk = ({ style }) => (
  <div
    style={{
      borderRadius: 4,
      backgroundImage:
        'linear-gradient(90deg,rgba(255,255,255,0.18) 25%,rgba(255,255,255,0.36) 50%,rgba(255,255,255,0.18) 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-shimmer 1.4s infinite',
      ...style,
    }}
  />
);

function ViajeDetalleSkeleton() {
  return (
    <div className="viaje-detalle-wrap">
      <Header />
      <main className="viaje-detalle-main">

        {/* Hero: misma estructura que .viaje-hero con gradiente púrpura real */}
        <div
          className="viaje-hero"
          style={{ background: 'linear-gradient(180deg,rgba(99,102,241,0.55) 0%,rgba(99,102,241,0.88) 100%)' }}
        >
          <div className="viaje-hero-content">

            {/* Top bar: botón volver + opciones (ambos 36×36px, border-radius 50%) */}
            <div className="viaje-hero-topbar">
              <HeroSk style={{ width: 36, height: 36, borderRadius: '50%' }} />
              <HeroSk style={{ width: 36, height: 36, borderRadius: '50%' }} />
            </div>

            {/* Emoji box: 56×56px, border-radius 14px */}
            <HeroSk style={{ width: 56, height: 56, borderRadius: 14, marginBottom: 4 }} />

            {/* Título: font-size 28px → ~34px */}
            <HeroSk style={{ height: 34, width: 200, borderRadius: 6 }} />

            {/* Badge de estado: padding 4px 12px + font 12px → ~24px */}
            <HeroSk style={{ height: 24, width: 78, borderRadius: 9999 }} />

            {/* Avatares de participantes: 30×30px, con overlap -7px */}
            <div style={{ display: 'flex', marginBottom: 4 }}>
              {[0, 1, 2].map((i) => (
                <HeroSk
                  key={i}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    marginLeft: i === 0 ? 0 : -7,
                    border: '2px solid rgba(255,255,255,0.7)',
                  }}
                />
              ))}
            </div>

            {/* Stat cards: usa las mismas clases reales */}
            <div className="viaje-hero-stats">
              {[1, 2].map((i) => (
                <div key={i} className="viaje-stat-card">
                  {/* label: font-size 10px uppercase → ~12px */}
                  <HeroSk style={{ height: 12, width: 48, borderRadius: 3, marginBottom: 6 }} />
                  {/* value: font-size 20px → ~24px */}
                  <HeroSk style={{ height: 24, width: 82, borderRadius: 4, marginBottom: 4 }} />
                  {/* sub: font-size 11px → ~13px */}
                  <HeroSk style={{ height: 13, width: 56, borderRadius: 3 }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contenido bajo el hero */}
        <div className="viaje-detalle-container">

          {/* Segmented tabs: usa la clase real para mismo padding/border-radius */}
          <div className="viaje-seg-tabs" style={{ pointerEvents: 'none' }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="sk viaje-seg-btn"
                style={{ flex: 1, height: 36 }}
              />
            ))}
          </div>

          {/* Filas de gastos simulados */}
          {[130, 110, 150, 120, 145, 105].map((descW, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Avatar del pagador: 30×30px */}
                <div className="sk" style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0 }} />
                <div>
                  {/* Descripción */}
                  <div className="sk" style={{ height: 15, width: descW, borderRadius: 4, marginBottom: 5 }} />
                  {/* Meta */}
                  <div className="sk" style={{ height: 12, width: 78, borderRadius: 4 }} />
                </div>
              </div>
              {/* Monto */}
              <div className="sk" style={{ height: 16, width: 64, borderRadius: 4 }} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default ViajeDetalleSkeleton;
