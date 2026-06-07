import React from 'react';
import Header from './Navbar';
import '../styles/table.css';
import '../styles/viajes.css';

/*
  Réplica fiel de ViajesPage usando los mismos CSS containers y tamaños exactos:
  - .viajes-toolbar-title:   font-size 22px → ~26px
  - .viajes-toolbar-sub:     font-size 13px → ~16px
  - .viajes-btn-primary:     padding 9px 18px + font 14px → ~36px alto
  - .viajes-section-title:   font-size 11px uppercase → ~14px
  - .viaje-card-mobile:      flex, border-radius 14px, border 1px
  - .viaje-card-accent:      4px ancho
  - .viaje-card-content:     padding 16px
  - emoji/imagen:             36×36px, border-radius 6px
  - título:                  font-size 15px → ~18px
  - badge:                   padding 2px 8px + font 11px → ~18px
  - participantes:           font-size 12px → ~15px
  - chip:                    padding 2px 8px + font 11px → ~18px
*/

const CARDS = [
  { titleW: 140, partW: 96, hasSecondChip: true },
  { titleW: 110, partW: 115, hasSecondChip: false },
  { titleW: 165, partW: 82, hasSecondChip: true },
  { titleW: 126, partW: 100, hasSecondChip: false },
];

function SkCard({ titleW, partW, hasSecondChip }) {
  return (
    <div className="viaje-card-mobile" style={{ cursor: 'default' }}>
      {/* Accent bar: 4px ancho, verde para "activo" */}
      <div className="viaje-card-accent activo" />

      {/* Contenido: padding 16px (igual que .viaje-card-content) */}
      <div className="viaje-card-content">
        {/* Fila superior: emoji (36×36) + título (font 15px) + badge (~18px alto) */}
        <div className="viaje-card-top">
          <div className="sk" style={{ width: 36, height: 36, borderRadius: 6, flexShrink: 0 }} />
          <div className="viaje-card-titulo-block">
            <div className="sk" style={{ height: 18, width: titleW, borderRadius: 4, marginBottom: 4 }} />
            <div className="sk" style={{ height: 18, width: 58, borderRadius: 9999 }} />
          </div>
        </div>

        {/* Participantes: font-size 12px → ~15px, margin-bottom 6px */}
        <div className="sk" style={{ height: 15, width: partW, borderRadius: 4, marginBottom: 6 }} />

        {/* Chips: padding 2px 8px + font 11px → ~18px */}
        <div className="viaje-card-chips">
          <div className="sk" style={{ height: 18, width: 72, borderRadius: 9999 }} />
          {hasSecondChip && (
            <div className="sk" style={{ height: 18, width: 58, borderRadius: 9999 }} />
          )}
        </div>
      </div>
    </div>
  );
}

function ViajesSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main style={{ paddingTop: 'calc(var(--navbar-height) + var(--space-6))', flex: 1 }}>
        <div className="viajes-container">

          {/* Toolbar: título (font 22px) + subtítulo (font 13px) + botón */}
          <div className="viajes-toolbar">
            <div>
              <div className="sk" style={{ height: 26, width: 140, borderRadius: 5, marginBottom: 6 }} />
              <div className="sk" style={{ height: 16, width: 100, borderRadius: 4 }} />
            </div>
            <div className="sk" style={{ height: 36, width: 120, borderRadius: 10 }} />
          </div>

          {/* Label de sección: font-size 11px uppercase → ~14px */}
          <div className="sk" style={{ height: 14, width: 58, borderRadius: 4, marginBottom: 12 }} />

          {/* Cards de viaje con clases CSS reales */}
          {CARDS.map((card, i) => (
            <SkCard key={i} {...card} />
          ))}
        </div>
      </main>
    </div>
  );
}

export default ViajesSkeleton;
