// src/components/viajes/AgregarActividadModal.jsx
import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';

export default function AgregarActividadModal({ fecha, actividad = null, onClose, onSave }) {
  const isEdit = !!actividad;
  const [titulo, setTitulo] = useState(actividad?.titulo || '');
  const [hora, setHora] = useState(actividad?.hora?.slice(0, 5) || '');
  const [ubicacion, setUbicacion] = useState(actividad?.ubicacion || '');
  const [nota, setNota] = useState(actividad?.nota || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleGuardar = async () => {
    if (!titulo.trim()) { setError('El título es obligatorio'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({
        ...(isEdit ? {} : { fecha }),
        hora: hora || null,
        titulo: titulo.trim(),
        ubicacion: ubicacion.trim() || null,
        nota: nota.trim() || null,
      });
    } catch {
      setError('Error al guardar la actividad');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon modal-icon-primary">📅</div>
            <div className="modal-title">{isEdit ? 'Editar actividad' : 'Agregar actividad'}</div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><FiX size={18} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {error && <div style={{ color: 'var(--color-error)', fontSize: 13 }}>{error}</div>}

          <div className="form-grid">
            <div className="form-field form-grid-full">
              <label className="form-label">Título *</label>
              <input className="form-input" placeholder="Ej: Check-in hotel" value={titulo} onChange={e => setTitulo(e.target.value)} autoFocus />
            </div>
            <div className="form-field">
              <label className="form-label">Hora</label>
              <input className="form-input" type="time" value={hora} onChange={e => setHora(e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">Ubicación</label>
              <input className="form-input" placeholder="Opcional" value={ubicacion} onChange={e => setUbicacion(e.target.value)} />
            </div>
            <div className="form-field form-grid-full">
              <label className="form-label">Nota</label>
              <textarea className="form-input" placeholder="Opcional" value={nota} onChange={e => setNota(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="viajes-btn-primary" onClick={handleGuardar} disabled={saving}>
            {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
}
