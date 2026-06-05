// src/components/viajes/ImagenGaleriaModal.jsx
import React, { useState } from 'react';
import { IoClose, IoCheckmark } from 'react-icons/io5';
import { CATEGORIAS_IMAGENES } from '../../constants/imagenesViaje';
import '../../styles/modal.css';
import '../../styles/viajes.css';

export default function ImagenGaleriaModal({ viaje, onClose, onSave }) {
  const [catIdx, setCatIdx] = useState(0);
  const [selected, setSelected] = useState(viaje.imagenUrl || null);
  const [saving, setSaving] = useState(false);

  const categoria = CATEGORIAS_IMAGENES[catIdx];

  const handleConfirm = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const url = selected ? `${selected}?w=1200&q=80` : null;
      await onSave(url);
      onClose();
    } catch {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(null);
      onClose();
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Imagen de portada</span>
          <button className="modal-close" onClick={onClose}><IoClose size={20} /></button>
        </div>

        <div className="modal-body">
          {/* Preview */}
          <div className="galeria-preview" style={selected ? { backgroundImage: `url(${selected}?w=800&q=60)` } : {}}>
            <div className="galeria-preview-gradient" />
            <div className="galeria-preview-content">
              <div className="galeria-preview-emoji">{viaje.emoji}</div>
              <div className="galeria-preview-titulo">{viaje.titulo}</div>
            </div>
          </div>

          {/* Category tabs */}
          <div className="galeria-tabs">
            {CATEGORIAS_IMAGENES.map((cat, i) => (
              <button
                key={cat.nombre}
                className={`galeria-tab-btn${catIdx === i ? ' active' : ''}`}
                onClick={() => setCatIdx(i)}
              >
                {cat.emoji} {cat.nombre}
              </button>
            ))}
          </div>

          {/* Image grid */}
          <div className="galeria-grid">
            {categoria.imagenes.map((url, i) => {
              const isSelected = selected && selected.startsWith(url);
              return (
                <button
                  key={i}
                  className={`galeria-img-btn${isSelected ? ' selected' : ''}`}
                  onClick={() => setSelected(url)}
                  style={{ backgroundImage: `url(${url}?w=400&q=60)` }}
                >
                  {isSelected && (
                    <div className="galeria-img-check">
                      <IoCheckmark size={16} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={handleClear} disabled={saving}>
            Sin imagen (usar gradiente)
          </button>
          <button
            className="viajes-btn-primary"
            onClick={handleConfirm}
            disabled={saving || !selected}
          >
            {saving ? 'Guardando…' : 'Usar esta imagen'}
          </button>
        </div>
      </div>
    </div>
  );
}
