import React from 'react';
import Header from './Navbar';
import '../styles/table.css';
import '../styles/deudores.css';

/*
  Réplica fiel de DeudoresPage usando los mismos CSS class containers y tamaños exactos:
  - .deudores-search-input: 200px × 36px
  - .deudores-filter-select: ~90px × 34px
  - .deudores-btn-primary:   ~118px × 36px
  - .deudores-resumen-chip:  padding 8px 14px + font-size 13px → ~32px de alto
  - .deuda-grupo-avatar:     36×36px, círculo
  - .deuda-grupo-nombre:     font-size 15px → ~18px
  - .deuda-grupo-subtotal:   padding 3px 10px + font-size 13px → ~22px
  - .deuda-fila:             padding var(--space-3) var(--space-5) (12px 20px)
  - .deuda-fila-descripcion: font-size 14px → ~17px
  - .deuda-fila-meta:        font-size 12px → ~15px
  - .deuda-fila-monto:       font-size 15px → ~18px
  - .deuda-btn-icon:         padding 5px + icon 17px → ~27px
*/

const GRUPOS = [2, 3, 1, 2];

function DeudoresSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main style={{ paddingTop: 'calc(var(--navbar-height) + var(--space-6))', flex: 1 }}>
        <div className="deudores-container">

          {/* Toolbar: search (200px) + 3 selects (~90px) + botón primario */}
          <div className="deudores-toolbar">
            <div className="deudores-toolbar-left">
              <div className="sk sk-input" style={{ width: 200 }} />
              <div className="sk sk-select" style={{ width: 90 }} />
              <div className="sk sk-select" style={{ width: 90 }} />
              <div className="sk sk-select" style={{ width: 90 }} />
            </div>
            <div className="sk" style={{ width: 118, height: 36, borderRadius: 10 }} />
          </div>

          {/* Resumen chips (padding: 8px 14px + font 13px → alto ~32px) */}
          <div className="deudores-resumen">
            <div className="sk" style={{ height: 32, width: 148, borderRadius: 9999 }} />
            <div className="sk" style={{ height: 32, width: 128, borderRadius: 9999 }} />
          </div>

          {/* Cards de grupos de deuda */}
          {GRUPOS.map((rowCount, gi) => (
            <div key={gi} className="deuda-grupo">

              {/* Header del grupo: avatar (36×36) + nombre (font 15px) + subtotal badge */}
              <div className="deuda-grupo-header">
                <div className="deuda-grupo-info">
                  <div className="sk" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
                  <div className="sk" style={{ width: 100 + gi * 18, height: 18, borderRadius: 4 }} />
                </div>
                {/* Subtotal: padding 3px 10px + font 13px → alto ~22px */}
                <div className="sk" style={{ width: 78, height: 22, borderRadius: 9999 }} />
              </div>

              {/* Filas de deuda individual */}
              {Array.from({ length: rowCount }).map((_, ri) => (
                <div key={ri} className="deuda-fila">
                  <div className="deuda-fila-left">
                    {/* descripción: font-size 14px → 17px */}
                    <div className="sk" style={{ width: 130 + ri * 22, height: 17, borderRadius: 4, marginBottom: 4 }} />
                    {/* meta: font-size 12px → 15px */}
                    <div className="sk" style={{ width: 88, height: 15, borderRadius: 4 }} />
                  </div>
                  <div className="deuda-fila-right">
                    {/* monto: font-size 15px → 18px */}
                    <div className="sk" style={{ width: 72, height: 18, borderRadius: 4 }} />
                    {/* 3 botones icono (padding 5px + icon 17px → ~27px) */}
                    <div className="deuda-fila-acciones">
                      <div className="sk" style={{ width: 27, height: 27, borderRadius: 6 }} />
                      <div className="sk" style={{ width: 27, height: 27, borderRadius: 6 }} />
                      <div className="sk" style={{ width: 27, height: 27, borderRadius: 6 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default DeudoresSkeleton;
