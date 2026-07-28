import React, { useState } from 'react';
import { IoAirplane } from 'react-icons/io5';

export default function ModoViajeModal({ viaje, onConfirm }) {
  const [activar, setActivar] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!viaje) return null;

  const handleConfirmar = async () => {
    setLoading(true);
    try {
      await onConfirm(activar);
    } finally {
      setLoading(false);
      setActivar(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: 380, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
          <div className="modal-icon modal-icon-primary" style={{ width: 56, height: 56 }}>
            <IoAirplane size={28} />
          </div>
        </div>
        <div className="modal-title" style={{ marginBottom: 'var(--space-2)' }}>¿Activar Modo Viaje?</div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 1.5, marginBottom: 'var(--space-4)' }}>
          {viaje.emoji} {viaje.titulo} ya empezó. Con Modo Viaje activado, la app te va a llevar directo a
          este viaje cada vez que la abras.
        </p>
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
            padding: '10px 14px', marginBottom: 'var(--space-4)',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600 }}>Activar Modo Viaje</span>
          <div
            className={`switch-track${activar ? ' on' : ''}`}
            style={{ width: 48, height: 26 }}
            onClick={() => !loading && setActivar(v => !v)}
          >
            <div className="switch-thumb" style={{ width: 18, height: 18, top: 4, left: activar ? 26 : 4 }} />
          </div>
        </div>
        <button className="viajes-btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleConfirmar} disabled={loading}>
          {loading ? 'Guardando…' : 'Confirmar'}
        </button>
      </div>
    </div>
  );
}
