// src/components/DeudaModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  TextField, Select, MenuItem, InputLabel, FormControl,
  Button, Checkbox, FormControlLabel,
} from '@mui/material';
import { IoCloseCircle, IoSearchOutline } from 'react-icons/io5';
import { userService } from '../services/userService';
import { contactService } from '../services/contactService';
import { MEDIOS_DE_PAGO, MONEDAS } from '../constants/catalogos';
import { formatFecha } from '../utils/formatters';

// Reutiliza los mismos sx de Modal.jsx
const _fieldBase = {
  '& .MuiInputLabel-root': { color: 'var(--color-text-muted)' },
  '& .MuiInputLabel-root.Mui-focused': { color: 'var(--color-primary)' },
  '& .MuiFormHelperText-root': { color: 'var(--color-error)', fontSize: '12px' },
  '& .MuiOutlinedInput-root': {
    color: 'var(--color-text-primary)',
    '&.Mui-focused fieldset': { borderColor: 'var(--color-primary)', borderWidth: '2px' },
    '& input, & textarea': { color: 'var(--color-text-primary)', caretColor: 'var(--color-primary)' },
    '& .MuiSelect-select': { color: 'var(--color-text-primary)' },
    '& .MuiSvgIcon-root': { color: 'var(--color-text-muted)' },
  },
};
const fieldSxEmpty = {
  ..._fieldBase,
  '& .MuiOutlinedInput-root': {
    ..._fieldBase['& .MuiOutlinedInput-root'],
    backgroundColor: 'var(--color-surface)',
    '& fieldset': { borderColor: 'var(--color-border)' },
    '&:hover fieldset': { borderColor: 'var(--color-primary)' },
  },
};
const fieldSxFilled = {
  ..._fieldBase,
  '& .MuiOutlinedInput-root': {
    ..._fieldBase['& .MuiOutlinedInput-root'],
    backgroundColor: 'var(--color-primary-light)',
    '& fieldset': { borderColor: 'var(--color-primary)' },
    '&:hover fieldset': { borderColor: 'var(--color-primary)' },
  },
};
const fieldSx = (v) => v ? fieldSxFilled : fieldSxEmpty;

const INITIAL = {
  esAcreedor: true,
  nombre: '',
  descripcion: '',
  monto: '',
  moneda: 'ARS',
  medio: '',
  tipo: 'debito',
  cuotas: '1',
  cantidad: '1',
  fechaDeuda: formatFecha(new Date()),
  isFijo: false,
  pagado: false,
};

export default function DeudaModal({ deuda, onClose, onSave }) {
  const dialogRef = useRef(null);
  const [form, setForm] = useState(deuda ? { ...INITIAL, ...deuda, monto: String(deuda.monto) } : INITIAL);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Compartir con usuario
  const [sharedUser, setSharedUser] = useState(null);
  const [searchEmail, setSearchEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [recentContacts, setRecentContacts] = useState([]);

  useEffect(() => {
    setRecentContacts(contactService.getRecent());
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    dialogRef.current?.focus();
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const set = (field) => (e) => {
    const val = e.target?.type === 'checkbox' ? e.target.checked : e.target?.value ?? e;
    setForm(prev => ({ ...prev, [field]: val }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.nombre.trim()) errs.nombre = 'El nombre es obligatorio';
    if (!form.monto || isNaN(Number(form.monto)) || Number(form.monto) <= 0) errs.monto = 'Ingresá un monto válido';
    if (!form.fechaDeuda) errs.fechaDeuda = 'La fecha es obligatoria';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave(form, sharedUser);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSearchUser = async () => {
    setSearchError('');
    if (!searchEmail.trim()) return;
    setSearching(true);
    try {
      const found = await userService.buscarPorEmail(searchEmail);
      if (found) {
        setSharedUser({ ...found, userId: found.id });
        setForm(prev => ({ ...prev, nombre: found.nombre || found.email, compartidoConNombre: found.nombre, compartidoConUserId: found.id }));
        setSearchError('');
        const next = contactService.saveContact(found);
        setRecentContacts(next);
      } else {
        setSearchError('No existe un usuario con ese email.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const overlayStyle = {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'var(--modal-backdrop)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 'var(--space-4)',
  };

  const panelStyle = {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-xl)',
    padding: 'var(--space-6)',
    width: '100%', maxWidth: 520,
    maxHeight: '90vh', overflowY: 'auto',
    boxShadow: 'var(--shadow-xl)',
    outline: 'none',
  };

  const isCredito = form.tipo === 'credito';

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={dialogRef} style={panelStyle} tabIndex={-1}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
            {deuda ? 'Editar deuda' : 'Nueva deuda'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}>
            <IoCloseCircle size={24} />
          </button>
        </div>

        {/* Toggle Acreedor/Deudor */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-4)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', padding: 4 }}>
          {[true, false].map(val => (
            <button
              key={String(val)}
              onClick={() => setForm(prev => ({ ...prev, esAcreedor: val }))}
              style={{
                flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer',
                borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: 13,
                background: form.esAcreedor === val ? 'var(--color-primary)' : 'transparent',
                color: form.esAcreedor === val ? 'white' : 'var(--color-text-muted)',
                transition: 'background 0.15s',
              }}
            >
              {val ? '💚 Me deben' : '🔴 Le debo a'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <TextField label="Nombre *" value={form.nombre} onChange={set('nombre')}
            size="small" fullWidth sx={fieldSx(form.nombre)} error={!!errors.nombre} helperText={errors.nombre} />

          <TextField label="Descripción" value={form.descripcion} onChange={set('descripcion')}
            size="small" fullWidth sx={fieldSx(form.descripcion)} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <TextField label="Monto *" value={form.monto} onChange={set('monto')}
              size="small" type="number" inputProps={{ min: 0, step: 0.01 }}
              sx={fieldSx(form.monto)} error={!!errors.monto} helperText={errors.monto} />

            <FormControl size="small" sx={fieldSx(form.moneda)}>
              <InputLabel>Moneda</InputLabel>
              <Select value={form.moneda} label="Moneda" onChange={set('moneda')}>
                {MONEDAS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </Select>
            </FormControl>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <FormControl size="small" sx={fieldSx(form.medio)}>
              <InputLabel>Medio</InputLabel>
              <Select value={form.medio} label="Medio" onChange={set('medio')}>
                <MenuItem value="">—</MenuItem>
                {MEDIOS_DE_PAGO.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl size="small" sx={fieldSx(form.tipo)}>
              <InputLabel>Tipo</InputLabel>
              <Select value={form.tipo} label="Tipo" onChange={set('tipo')}>
                <MenuItem value="debito">Débito</MenuItem>
                <MenuItem value="credito">Crédito</MenuItem>
                <MenuItem value="transferencia">Transferencia</MenuItem>
              </Select>
            </FormControl>
          </div>

          {isCredito && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <TextField label="Cuotas" value={form.cuotas} onChange={set('cuotas')}
                size="small" type="number" inputProps={{ min: 1 }} sx={fieldSx(form.cuotas)} />
              <TextField label="Cantidad" value={form.cantidad} onChange={set('cantidad')}
                size="small" type="number" inputProps={{ min: 1 }} sx={fieldSx(form.cantidad)} />
            </div>
          )}

          <TextField label="Fecha *" value={form.fechaDeuda} onChange={set('fechaDeuda')}
            size="small" fullWidth sx={fieldSx(form.fechaDeuda)}
            placeholder="DD/MM/YYYY"
            error={!!errors.fechaDeuda} helperText={errors.fechaDeuda} />

          <FormControlLabel
            control={<Checkbox checked={form.isFijo} onChange={set('isFijo')} size="small" />}
            label={<span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Gasto fijo / recurrente</span>}
          />
        </div>

        {/* Compartir con usuario */}
        {!deuda && (
          <div style={{ marginTop: 'var(--space-5)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
              Compartir con usuario (opcional)
            </p>
            {sharedUser ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--color-primary-light)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: 14, color: 'var(--color-primary)', fontWeight: 600 }}>
                  {sharedUser.nombre || sharedUser.email}
                </span>
                <button onClick={() => { setSharedUser(null); setForm(prev => ({ ...prev, compartidoConNombre: null, compartidoConUserId: null })); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                  <IoCloseCircle size={18} />
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 8 }}>
                  <TextField
                    value={searchEmail} onChange={e => setSearchEmail(e.target.value)}
                    placeholder="Email del usuario" size="small" sx={fieldSxEmpty}
                    style={{ flex: 1 }}
                    onKeyDown={e => { if (e.key === 'Enter') handleSearchUser(); }}
                  />
                  <Button variant="outlined" onClick={handleSearchUser} disabled={searching} size="small"
                    sx={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)', minWidth: 40 }}>
                    {searching ? '...' : <IoSearchOutline size={16} />}
                  </Button>
                </div>
                {searchError && (
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-error)' }}>{searchError}</p>
                )}
                {recentContacts.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {recentContacts.map(c => (
                      <button key={c.userId} onClick={() => { setSharedUser({ ...c, userId: c.id || c.userId }); setForm(prev => ({ ...prev, nombre: c.nombre || c.email, compartidoConNombre: c.nombre, compartidoConUserId: c.id || c.userId })); }}
                        style={{ padding: '4px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', fontSize: 12, background: 'var(--color-surface)', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                        {c.nombre || c.email}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Botones */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)', justifyContent: 'flex-end' }}>
          <Button onClick={onClose} variant="outlined" size="small"
            sx={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
            Cancelar
          </Button>
          <Button onClick={handleSave} variant="contained" size="small" disabled={saving}
            sx={{ background: 'var(--color-primary)', '&:hover': { background: 'var(--color-primary-hover)' } }}>
            {saving ? 'Guardando...' : (deuda ? 'Guardar cambios' : 'Agregar deuda')}
          </Button>
        </div>
      </div>
    </div>
  );
}
