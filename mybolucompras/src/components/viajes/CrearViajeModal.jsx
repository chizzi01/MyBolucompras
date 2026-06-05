// src/components/viajes/CrearViajeModal.jsx
import React, { useState, useEffect } from 'react';
import { FiX, FiSearch } from 'react-icons/fi';
import { IoAirplaneOutline } from 'react-icons/io5';
import { userService } from '../../services/userService';

const EMOJIS = ['✈️','🏖️','🏔️','🗺️','🌍','🏕️','🚗','🚢','🚂','🎡','🏛️','🍽️','🎭','🌊','🧳','🏄','⛷️','🎿','🚵','🌅'];

export default function CrearViajeModal({ onClose, onSave, currentUserId, currentUserNombre, viaje = null }) {
  const [titulo, setTitulo] = useState(viaje?.titulo || '');
  const [emoji, setEmoji] = useState(viaje?.emoji || '✈️');
  const [participantes, setParticipantes] = useState([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!viaje;

  const handleBuscar = async () => {
    if (!searchEmail.trim()) return;
    setSearching(true);
    setSearchError('');
    setSearchResult(null);
    try {
      const found = await userService.buscarPorEmail(searchEmail.trim());
      if (!found) { setSearchError('Usuario no encontrado'); return; }
      if (found.id === currentUserId) { setSearchError('No podés agregarte a vos mismo'); return; }
      if (participantes.some(p => p.userId === found.id)) { setSearchError('Ya está en la lista'); return; }
      setSearchResult({ userId: found.id, nombre: found.nombre || found.email, email: found.email });
    } catch {
      setSearchError('Error al buscar usuario');
    } finally {
      setSearching(false);
    }
  };

  const handleAgregarParticipante = () => {
    if (!searchResult) return;
    setParticipantes(prev => [...prev, searchResult]);
    setSearchResult(null);
    setSearchEmail('');
  };

  const handleRemover = (userId) => {
    setParticipantes(prev => prev.filter(p => p.userId !== userId));
  };

  const handleGuardar = async () => {
    if (!titulo.trim()) { setError('El título es obligatorio'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(titulo.trim(), emoji, participantes.map(p => p.userId));
    } catch {
      setError('Error al guardar');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon modal-icon-primary"><IoAirplaneOutline size={18} /></div>
            <div>
              <div className="modal-title">{isEdit ? 'Editar viaje' : 'Nuevo viaje'}</div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><FiX size={18} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {error && <div style={{ color: 'var(--color-error)', fontSize: 13 }}>{error}</div>}

          {/* Título */}
          <div className="form-field">
            <label className="form-label">Título *</label>
            <input
              className="form-input"
              placeholder="Ej: Vacaciones en Córdoba"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              autoFocus
            />
          </div>

          {/* Emoji */}
          <div className="form-field">
            <label className="form-label">Emoji</label>
            <div className="viaje-modal-emoji-grid">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  className={`viaje-modal-emoji-btn${emoji === e ? ' selected' : ''}`}
                  onClick={() => setEmoji(e)}
                  type="button"
                >{e}</button>
              ))}
            </div>
          </div>

          {/* Participantes */}
          {!isEdit && (
            <div className="form-field">
              <label className="form-label">Agregar participantes</label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <input
                  className="form-input"
                  placeholder="Email del participante"
                  value={searchEmail}
                  onChange={e => { setSearchEmail(e.target.value); setSearchError(''); setSearchResult(null); }}
                  onKeyDown={e => e.key === 'Enter' && handleBuscar()}
                />
                <button
                  className="viajes-btn-primary"
                  style={{ padding: '9px 14px', flexShrink: 0 }}
                  onClick={handleBuscar}
                  disabled={searching}
                  type="button"
                >
                  <FiSearch size={15} />
                </button>
              </div>
              {searchError && <div style={{ color: 'var(--color-error)', fontSize: 12, marginTop: 4 }}>{searchError}</div>}
              {searchResult && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, padding: '8px 12px', background: 'var(--color-surface-hover)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: 14 }}>{searchResult.nombre} <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>({searchResult.email})</span></span>
                  <button className="viajes-btn-primary" style={{ padding: '5px 12px', fontSize: 13 }} onClick={handleAgregarParticipante} type="button">Agregar</button>
                </div>
              )}

              {/* Creator chip (non-removable) */}
              <div className="viaje-modal-participantes-list">
                <div className="viaje-modal-participante-chip" style={{ opacity: 0.7 }}>
                  {currentUserNombre} (vos)
                </div>
                {participantes.map(p => (
                  <div key={p.userId} className="viaje-modal-participante-chip">
                    {p.nombre}
                    <button className="viaje-modal-participante-remove" onClick={() => handleRemover(p.userId)} type="button">
                      <FiX size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="viajes-btn-primary" onClick={handleGuardar} disabled={saving}>
            {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear viaje'}
          </button>
        </div>
      </div>
    </div>
  );
}
