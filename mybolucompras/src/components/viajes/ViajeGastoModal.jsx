// src/components/viajes/ViajeGastoModal.jsx
import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';

export default function ViajeGastoModal({ viaje, currentUserId, onClose, onSave }) {
  const today = new Date().toISOString().split('T')[0];
  const [objeto, setObjeto] = useState('');
  const [precio, setPrecio] = useState('');
  const [fecha, setFecha] = useState(today);
  const [pagadoPor, setPagadoPor] = useState(currentUserId);
  const [modoSplit, setModoSplit] = useState('todos');
  const [algunos, setAlgunos] = useState([]);
  const [etiqueta, setEtiqueta] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleAlguno = (userId) => {
    setAlgunos(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const handleGuardar = async () => {
    if (!objeto.trim()) { setError('El nombre es obligatorio'); return; }
    if (!precio || isNaN(Number(precio)) || Number(precio) <= 0) { setError('El precio debe ser mayor a 0'); return; }
    if (modoSplit === 'algunos' && algunos.length === 0) { setError('Seleccioná al menos un participante'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(
        { objeto: objeto.trim(), precio: Number(precio), fecha, pagadoPor, etiqueta: etiqueta.trim() || null },
        { modoSplit, participanteIds: modoSplit === 'algunos' ? algunos : viaje.participantes.map(p => p.userId) }
      );
    } catch {
      setError('Error al agregar el gasto');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon modal-icon-primary">💸</div>
            <div className="modal-title">Agregar gasto</div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><FiX size={18} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {error && <div style={{ color: 'var(--color-error)', fontSize: 13 }}>{error}</div>}

          <div className="form-grid">
            <div className="form-field form-grid-full">
              <label className="form-label">Descripción *</label>
              <input className="form-input" placeholder="Ej: Almuerzo en la ruta" value={objeto} onChange={e => setObjeto(e.target.value)} autoFocus />
            </div>
            <div className="form-field">
              <label className="form-label">Precio total *</label>
              <input className="form-input" type="number" placeholder="0" value={precio} onChange={e => setPrecio(e.target.value)} min="0" step="0.01" />
            </div>
            <div className="form-field">
              <label className="form-label">Fecha</label>
              <input className="form-input" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            <div className="form-field form-grid-full">
              <label className="form-label">¿Quién pagó?</label>
              <select className="form-select" value={pagadoPor} onChange={e => setPagadoPor(e.target.value)}>
                {viaje.participantes.map(p => (
                  <option key={p.userId} value={p.userId}>{p.nombre}{p.userId === currentUserId ? ' (vos)' : ''}</option>
                ))}
              </select>
            </div>
            <div className="form-field form-grid-full">
              <label className="form-label">¿Cómo se divide?</label>
              <div className="viaje-split-selector">
                {[['todos','Entre todos'],['algunos','Algunos'],['solo','Solo quien pagó']].map(([val, label]) => (
                  <button key={val} type="button" className={`viaje-split-btn${modoSplit === val ? ' active' : ''}`} onClick={() => setModoSplit(val)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {modoSplit === 'algunos' && (
              <div className="form-field form-grid-full">
                <label className="form-label">Participantes</label>
                <div className="viaje-algunos-checks">
                  {viaje.participantes.filter(p => p.userId !== pagadoPor).map(p => (
                    <label key={p.userId} className="viaje-algunos-check-item">
                      <input type="checkbox" checked={algunos.includes(p.userId)} onChange={() => toggleAlguno(p.userId)} />
                      {p.nombre}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="form-field form-grid-full">
              <label className="form-label">Etiqueta (opcional)</label>
              <input className="form-input" placeholder="Ej: Comida" value={etiqueta} onChange={e => setEtiqueta(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="viajes-btn-primary" onClick={handleGuardar} disabled={saving}>
            {saving ? 'Agregando…' : 'Agregar gasto'}
          </button>
        </div>
      </div>
    </div>
  );
}
