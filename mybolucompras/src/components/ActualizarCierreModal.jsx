// src/components/ActualizarCierreModal.jsx
import React, { useState, useEffect } from 'react';
import { FiX, FiCalendar, FiCreditCard } from 'react-icons/fi';
import { useData } from '../context/DataContext';
import { useToast } from './Toast';
import { sumarDiasHabiles } from '../utils/cuotas';

function formatDisplay(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

function formatToDB(date) {
  return date.toISOString().split('T')[0];
}

function parseDBDate(str) {
  if (!str) return new Date();
  const [y, m, d] = str.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
}

function defaultNuevoCierre(oldCierreStr) {
  const old = parseDBDate(oldCierreStr);
  const next = new Date(old);
  next.setMonth(next.getMonth() + 1);
  return next;
}

export default function ActualizarCierreModal({ visible, onClose }) {
  const { mydata, actualizarCierre } = useData();
  const addToast = useToast();

  const [nuevoCierre, setNuevoCierre] = useState(() => defaultNuevoCierre(mydata?.cierre));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && mydata?.cierre) {
      setNuevoCierre(defaultNuevoCierre(mydata.cierre));
    }
  }, [visible, mydata?.cierre]);

  if (!visible) return null;

  const oldCierreDisplay = mydata?.cierre ? formatDisplay(parseDBDate(mydata.cierre)) : '';

  const minDate = mydata?.cierre
    ? parseDBDate(mydata.cierre).toISOString().split('T')[0]
    : undefined;

  const handleDateChange = (e) => {
    if (!e.target.value) return;
    const [y, m, d] = e.target.value.split('-');
    setNuevoCierre(new Date(parseInt(y), parseInt(m) - 1, parseInt(d)));
  };

  const handleGuardar = async () => {
    setLoading(true);
    try {
      const nuevoVencimiento = sumarDiasHabiles(nuevoCierre, 10);
      await actualizarCierre(
        formatToDB(nuevoCierre),
        formatToDB(nuevoVencimiento),
        mydata.cierre,
        mydata.vencimiento,
      );
      addToast('Período de tarjeta actualizado', 'success');
      onClose();
    } catch {
      addToast('Error al actualizar el cierre', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cierre-modal-backdrop" onClick={onClose}>
      <div className="cierre-modal-card" onClick={e => e.stopPropagation()}>
        <button className="cierre-modal-close" onClick={onClose} aria-label="Cerrar">
          <FiX size={18} />
        </button>

        <div className="cierre-modal-icon">
          <FiCreditCard size={30} />
        </div>

        <h2 className="cierre-modal-title">Nuevo período de tarjeta</h2>
        <p className="cierre-modal-message">
          El cierre del <strong>{oldCierreDisplay}</strong> ya pasó.<br />
          Ingresá la nueva fecha de cierre.
        </p>

        <div className="cierre-modal-field">
          <FiCalendar size={15} className="cierre-modal-field-icon" />
          <input
            type="date"
            className="cierre-modal-date-input"
            value={formatToDB(nuevoCierre)}
            min={minDate}
            onChange={handleDateChange}
          />
        </div>

        <div className="cierre-modal-actions">
          <button className="cierre-modal-btn-cancel" onClick={onClose} disabled={loading}>
            Ahora no
          </button>
          <button className="cierre-modal-btn-primary" onClick={handleGuardar} disabled={loading}>
            {loading ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
