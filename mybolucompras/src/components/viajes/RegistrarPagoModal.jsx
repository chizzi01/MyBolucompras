// src/components/viajes/RegistrarPagoModal.jsx
import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';
import { viajePagosService } from '../../services/viajePagosService';
import { useToast } from '../Toast';

export default function RegistrarPagoModal({ visible, onClose, onSuccess, viaje, transaccion }) {
  const addToast = useToast();
  const [monto, setMonto] = useState(transaccion?.monto?.toString() || '');
  const [saving, setSaving] = useState(false);

  if (!visible || !transaccion) return null;

  const handleGuardar = async () => {
    const m = Number(monto);
    if (!m || m <= 0) return;
    setSaving(true);
    try {
      await viajePagosService.registrar(viaje.id, transaccion.de, transaccion.hacia, m);
      addToast('Pago registrado', 'success');
      onSuccess();
    } catch {
      addToast('Error al registrar el pago', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon modal-icon-success">✓</div>
            <div className="modal-title">Registrar pago</div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><FiX size={18} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
            <strong>{transaccion.deNombre}</strong> le paga a <strong>{transaccion.haciaNombre}</strong>
          </p>
          <div className="form-field">
            <label className="form-label">Monto</label>
            <input
              className="form-input"
              type="number"
              value={monto}
              onChange={e => setMonto(e.target.value)}
              min="0"
              step="0.01"
              autoFocus
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="viajes-btn-primary" onClick={handleGuardar} disabled={saving}>
            {saving ? 'Guardando…' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
