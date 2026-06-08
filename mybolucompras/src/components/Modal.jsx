import React, { useState, useMemo, useEffect, useRef } from 'react';
import { IoArrowBackCircle, IoSaveOutline, IoAddCircleOutline, IoEyeOffOutline, IoPeopleOutline, IoCloseCircle, IoSearchOutline } from "react-icons/io5";
import { userService } from '../services/userService';
import { contactService } from '../services/contactService';
import { TextField, Select, MenuItem, InputLabel, FormControl, Button, InputAdornment, FormHelperText } from '@mui/material';
import "../App.css";
import Dashboard from './Dashboard';
import { FaCreditCard } from "react-icons/fa6";
import { FaMoneyBill1Wave } from "react-icons/fa6";
import { FaMoneyBillTransfer } from "react-icons/fa6";
import { BsCreditCard2Front } from "react-icons/bs";
import { CiBank } from "react-icons/ci";
import { SiAmericanexpress, SiMastercard, SiVisa } from "react-icons/si";
import { CirclePicker } from 'react-color';
import { calcularCuotasRestantesCredito } from '../utils/cuotas';
import { parsePrecio, formatARS, parseFecha, getCurrencySymbol } from '../utils/formatters';
import { BANCOS, MEDIOS_DE_PAGO, MONEDAS } from '../constants/catalogos';
import { useTheme } from '../context/ThemeContext';
import { useExchangeRate } from '../hooks/useExchangeRate';

/* Estilos MUI — usan CSS variables para respetar dark/light mode */
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
  '& .MuiInputAdornment-root .MuiTypography-root': { color: 'var(--color-text-muted)' },
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
const fieldSx = (hasValue) => hasValue ? fieldSxFilled : fieldSxEmpty;

function Modal({ data, formData, totalGastado, setFormData, mydata, setMyData, saveMyData, handleSubmit, handleDelete, handleDeleteEtiqueta, handleEdit, setModalVisible, handleCloseModal, handleChangeCierre, handleAgregarFondos, handleCreateEtiqueta, modalType }) {
  const { theme } = useTheme();
  const { usdToArs } = useExchangeRate();
  const iconColor = theme === 'dark' ? '#ffffff' : '#575757';
  const [showSumInput, setShowSumInput] = useState(false);
  const [additionalFunds, setAdditionalFunds] = useState('');
  const [tempCierre, setTempCierre] = useState(mydata.cierre || '');
  const [showHelperText, setShowHelperText] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#fff');
  const [confirmarBorrado, setConfirmarBorrado] = useState(null);
  const dialogRef = useRef(null);

  // --- Compartir gasto ---
  const [sharedUser, setSharedUser] = useState(null);
  const [shareMode, setShareMode] = useState('dividir');
  const [searchEmail, setSearchEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [recentContacts, setRecentContacts] = useState([]);

  useEffect(() => {
    setRecentContacts(contactService.getRecent());
  }, []);

  const handleSearchUser = async () => {
    if (!searchEmail.trim()) return;
    setSearching(true);
    try {
      const found = await userService.buscarPorEmail(searchEmail);
      if (found) {
        setSharedUser(found);
        const next = contactService.saveContact(found);
        setRecentContacts(next);
      } else {
        alert('No existe un usuario con ese email.');
      }
    } catch (err) {
      console.error('Error buscando usuario:', err);
    } finally {
      setSearching(false);
    }
  };

  /* Bloquear scroll del body mientras el modal está abierto */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  /* Focus inicial al abrir el modal — solo una vez al montar */
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  /* Cerrar con Escape */
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') handleCloseModal();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleCloseModal]);

  const handleCloseWithConfirm = () => {
    handleCloseModal();
  };

  const getEstadoPresupuesto = (gastado, presupuesto) => {
    if (!presupuesto || presupuesto <= 0) {
      return {
        porcentaje: 0,
        color: '#9ca3af', // gris
        mensaje: 'Sin presupuesto definido'
      };
    }

    const porcentajeReal = (gastado / presupuesto) * 100;
    const porcentaje = Math.min(porcentajeReal, 100);

    // 🔴 EXCEDIDO
    if (gastado > presupuesto) {
      return {
        porcentaje,
        color: '#ef4444', // rojo
        mensaje: '⚠️ Presupuesto excedido'
      };
    }

    // 🟡 CERCA DEL LÍMITE
    if (porcentaje >= 80 && porcentaje < 100) {
      return {
        porcentaje,
        color: '#f59e0b', // amarillo
        mensaje: '⚠️ Cerca del límite'
      };
    }

    // 🟢 OK
    return {
      porcentaje,
      color: '#22c55e', // verde
      mensaje: 'En presupuesto'
    };
  };

  // guarda la etiqueta que se quiere borrar
  const calcularMontoMensual = (item) => {
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    const moneda = item.moneda?.trim() || 'ARS';
    const precio = parsePrecio(item.precio);
    if (isNaN(precio)) return null;

    // 🟢 CUOTAS RESTANTES
    const cuotasRestantes = calcularCuotasRestantesCredito(
      item.fecha,
      item.cuotas,
      mydata?.vencimiento,
      mydata?.cierre,
      mydata?.vencimientoAnterior,
      mydata?.cierreAnterior
    );

    // 🟢 GASTOS FIJOS (NO se dividen)
    if (item.isFijo) {
      if (cuotasRestantes > 0) {
        return { moneda, monto: precio };
      }
      return null;
    }

    // 🟢 CRÉDITO
    if (item.tipo === 'credito' && item.cuotas > 0) {
      if (cuotasRestantes > 0) {
        return { moneda, monto: precio / item.cuotas };
      }
      return null;
    }

    // 🟢 DÉBITO / EFECTIVO / TRANSFERENCIA
    const fechaCompra = parseFecha(item.fecha);
    if (
      fechaCompra.getMonth() === mesActual &&
      fechaCompra.getFullYear() === anioActual
    ) {
      return { moneda, monto: precio };
    }

    return null;
  };



  const handleColorChange = (color) => {
    setSelectedColor(color.hex);
    setFormData({ ...formData, color: color.hex });
  };

  const ocultarEtiqueta = (etiqueta) => {
    const updated = {
      ...mydata,
      presupuestos: {
        ...mydata.presupuestos,
        [etiqueta]: {
          ...(mydata.presupuestos?.[etiqueta] || {}),
          visible: false
        }
      }
    };

    setMyData(updated);
    saveMyData(updated);
  };

  const etiquetasOcultas = mydata.etiquetas.filter(
    e => mydata.presupuestos?.[e.nombre]?.visible === false
  );
  const mostrarEtiqueta = (etiqueta) => {
    const updated = {
      ...mydata,
      presupuestos: {
        ...mydata.presupuestos,
        [etiqueta]: {
          ...(mydata.presupuestos?.[etiqueta] || {}),
          visible: true
        }
      }
    };

    setMyData(updated);
    saveMyData(updated);
  };
  const actualizarPresupuesto = (nombre, cambios) => {
    const nuevoMyData = {
      ...mydata,
      presupuestos: {
        ...mydata.presupuestos,
        [nombre]: {
          ...(mydata.presupuestos?.[nombre] || {}),
          ...cambios
        }
      }
    };

    setMyData(nuevoMyData);
    saveMyData(nuevoMyData);
  };
  const validateForm = () => {
    if (modalType === 'nuevo' || modalType === 'editar') {
      return formData.objeto && formData.fecha && formData.medio && formData.precio;
    }
    if (modalType === 'fondos') {
      return showSumInput ? additionalFunds : mydata.fondos !== '' && mydata.fondos !== null && mydata.fondos !== undefined;
    }
    if (modalType === 'vencimiento') {
      return tempCierre;
    }
    return true;
  };
  // console.log('DATA EN MODAL:', data);

  const gastosPorEtiqueta = useMemo(() => {
    const totales = {};
    if (!Array.isArray(data)) return totales;

    data.forEach(item => {
      if (!item.etiqueta) return;

      const resultado = calcularMontoMensual(item);
      if (!resultado) return;

      const { moneda, monto } = resultado;
      const etiqueta = item.etiqueta;

      if (!totales[etiqueta]) totales[etiqueta] = {};
      if (!totales[etiqueta][moneda]) totales[etiqueta][moneda] = 0;

      totales[etiqueta][moneda] += monto;
    });

    return totales;
  }, [data, mydata.cierre, mydata.cierreAnterior, mydata.vencimiento, mydata.vencimientoAnterior]);







  const coloresPorEtiqueta = useMemo(
    () => Object.fromEntries((mydata.etiquetas || []).map(e => [e.nombre, e.color])),
    [mydata.etiquetas]
  );


  const handleSave = () => {
    if (validateForm()) {
      setShowHelperText(false);
      const sharedWith = sharedUser
        ? { userId: sharedUser.id, mode: shareMode, nombre: sharedUser.nombre || sharedUser.email }
        : null;
      if (modalType === 'nuevo') {
        handleSubmit(sharedWith);
      } else if (modalType === 'editar') {
        handleEdit(sharedWith);
      } else if (modalType === 'fondos') {
        if (showSumInput) {
          const newFunds = parseFloat(mydata.fondos || 0) + parseFloat(additionalFunds);
          handleAgregarFondos({ target: { value: newFunds } });
        } else {
          handleAgregarFondos({ target: { value: mydata.fondos } });
        }
      } else if (modalType === 'vencimiento') {
        handleChangeCierre({ target: { value: tempCierre } });
      } else if (modalType === 'crearEtiqueta') {
        handleCreateEtiqueta();
      }
    } else {
      setShowHelperText(true);
    }
  };

  const handleSumFunds = () => {
    const newFunds = parseFloat(mydata.fondos) + parseFloat(additionalFunds);
    setMyData({ ...mydata, fondos: newFunds });
    setAdditionalFunds('');
    setShowSumInput(false);
  };

  const handlePresupuestoChange = (etiqueta, campo, valor) => {
    const updatedMyData = {
      ...mydata,
      presupuestos: {
        ...mydata.presupuestos,
        [etiqueta]: {
          ...mydata.presupuestos?.[etiqueta],
          [campo]: valor
        }
      }
    };

    setMyData(updatedMyData);
    saveMyData(updatedMyData);
  };



  // renderCommonFields removed — now inlined in mf-form grid below

  const bancosDisponibles = mydata?.bancosHabilitados?.length > 0 ? mydata.bancosHabilitados : BANCOS;
  const mediosDisponibles = mydata?.mediosHabilitados?.length > 0 ? mydata.mediosHabilitados : MEDIOS_DE_PAGO;
  const [selectedCurrency, setSelectedCurrency] = useState(formData.moneda || mydata?.monedaPreferida || 'ARS');

  // Actualiza la moneda en el formData y el estado local
  const handleCurrencyChange = (e) => {
    setSelectedCurrency(e.target.value);
    setFormData({ ...formData, moneda: e.target.value });
  };

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) handleCloseWithConfirm(); }}
    >
      <div
        ref={dialogRef}
        id="modal-agregar"
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-label={
          modalType === 'nuevo' ? (formData.isFijo ? 'Agregar Gasto Fijo' : 'Agregar Nuevo Gasto')
          : modalType === 'fondos' ? 'Administrar Fondos'
          : modalType === 'vencimiento' ? 'Fecha de Cierre de Tarjeta'
          : modalType === 'eliminar' ? 'Confirmar Eliminación'
          : modalType === 'editar' ? 'Editar Registro'
          : modalType === 'crearEtiqueta' ? 'Crear Grupo'
          : modalType === 'presupuesto' ? 'Presupuestos'
          : modalType === 'reporte' ? 'Reporte'
          : 'Modal'
        }
        tabIndex={-1}
        style={{
          height:
            modalType === "vencimiento"
              ? "300px"
              : modalType === "fondos"
                ? "420px"
                : modalType === "eliminar"
                  ? "300px"
                  : modalType === "reporte"
                    ? "90%"
                    : modalType === "presupuesto"
                      ? "90%"
                      : modalType === "crearEtiqueta"
                          ? "500px"
                          : (modalType === "nuevo" || modalType === "editar")
                            ? "auto"
                            : "500px",
          maxHeight: (modalType === "nuevo" || modalType === "editar") ? "90vh" : undefined,
          width: modalType === "reporte" || modalType === "presupuesto" ? "90%" : "560px",

          // 🎨 Fondo según tipo de modal
          background:
            modalType === "vencimiento"
              ? "linear-gradient(135deg, rgba(255, 194, 237, 0.67), rgba(228, 83, 204, 0.72))" // rosa pastel violeta
              : modalType === "fondos"
                ? "linear-gradient(135deg, rgba(173, 255, 228, 0.67), rgba(85, 242, 247, 0.72))" // celeste-menta pastel
                : modalType === "eliminar"
                  ? "linear-gradient(135deg, rgba(255, 165, 165, 0.67), rgba(255, 111, 111, 0.72))" // rojo coral pastel
                  : modalType === "reporte"
                    ? "linear-gradient(135deg, rgba(154, 129, 255, 0.67), rgba(98, 19, 255, 0.73))" // violeta pastel
                    : modalType === "presupuesto"
                      ? "linear-gradient(135deg, rgba(67, 111, 255, 0.67), rgba(19, 35, 255, 0.73))" // violeta pastel
                      : (modalType === "nuevo" && formData.isFijo)
                        ? "linear-gradient(135deg, rgba(253, 232, 123, 0.8), rgba(253, 207, 82, 0.76))" // amarillo pastel fijo
                        : modalType === "crearEtiqueta"
                          ? "linear-gradient(135deg, rgba(214, 184, 255, 0.9), rgba(157, 11, 255, 0.72))" // violeta suave
                          : "linear-gradient(135deg, rgba(175, 255, 164, 0.78), rgba(100, 255, 28, 0.72))", // default

          backdropFilter: "blur(16px) saturate(180%)",
          WebkitBackdropFilter: "blur(16px) saturate(180%)",
          borderRadius: "20px",
          border: "1px solid rgba(255, 255, 255, 0.25)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >

        <div className="eliminar-align">
          <button
            id="eliminar"
            className="close"
            onClick={handleCloseWithConfirm}
            aria-label="Cerrar modal"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
          >
            <IoArrowBackCircle size={30} />
          </button>
        </div>
        <div
          className="modal-align"
          style={
            modalType === 'reporte'
              ? { flex: 1, overflowY: 'auto', justifyContent: 'flex-start', alignItems: 'center', paddingBottom: 16 }
              : modalType === 'presupuesto'
              ? { flex: 1, overflowY: 'auto', justifyContent: 'flex-start', alignItems: 'flex-start', paddingBottom: 16 }
              : (modalType === 'nuevo' || modalType === 'editar')
              ? { flex: 1, overflowY: 'auto', justifyContent: 'flex-start', alignItems: 'center', paddingBottom: 16 }
              : {}
          }
        >
          <h2>
            {modalType === 'nuevo' && (formData.isFijo ? 'Agregar Fijo' : 'Agregar Nuevo')}
            {modalType === 'fondos' && 'Fondos'}
            {modalType === 'vencimiento' && 'Cierre de Tarjeta'}
            {modalType === 'eliminar' && 'Confirmar Eliminación'}
            {modalType === 'editar' && 'Editar Registro'}
            {modalType === 'crearEtiqueta' && 'Crear Grupo'}
            {modalType === 'eliminarEtiqueta' && 'Eliminar Grupo'}
          </h2>
          <form className='formDatos' onSubmit={(e) => e.preventDefault()}>
            {(modalType === 'nuevo' || modalType === 'editar') && (
              <div className="mf-form">

                {/* ── 1. Tipo de gasto toggle ── */}
                {modalType === 'nuevo' && (
                  <div className="mf-section-full">
                    <div className="mf-label">Tipo de gasto</div>
                    <div className="mf-tipo-row">
                      {[
                        { key: false, icon: '⚡', label: 'Variable', desc: 'Un gasto puntual' },
                        { key: true,  icon: '🔄', label: 'Fijo',     desc: 'Recurrente / suscripción' },
                      ].map(op => {
                        const active = !!formData.isFijo === op.key;
                        return (
                          <button key={String(op.key)} type="button" className={`mf-tipo-btn${active ? ' active' : ''}`}
                            onClick={() => setFormData(prev => ({ ...prev, isFijo: op.key, cuotas: 1, tipo: op.key ? 'debito' : prev.tipo }))}>
                            <span className="mf-tipo-icon">{op.icon}</span>
                            <span className="mf-tipo-label">{op.label}</span>
                            <span className="mf-tipo-desc">{op.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── 2. Objeto + Fecha ── */}
                <div className="mf-row">
                  <div className="mf-field">
                    <div className="mf-label">Objeto {showHelperText && !formData.objeto && <span className="mf-error">*</span>}</div>
                    <input className="mf-input" placeholder="Ej: Zapatillas" value={formData.objeto}
                      onChange={e => setFormData({ ...formData, objeto: e.target.value })} autoFocus />
                  </div>
                  <div className="mf-field">
                    <div className="mf-label">{formData.isFijo ? 'Fecha de inicio' : 'Fecha de compra'} {showHelperText && !formData.fecha && <span className="mf-error">*</span>}</div>
                    <input className="mf-input" type="date" value={formData.fecha}
                      onChange={e => setFormData({ ...formData, fecha: e.target.value })} />
                  </div>
                </div>

                {/* ── 3. Medio + Banco ── */}
                <div className="mf-row">
                  <div className="mf-field">
                    <div className="mf-label">Medio de pago {showHelperText && !formData.medio && <span className="mf-error">*</span>}</div>
                    <select className="mf-select" value={formData.medio} onChange={e => setFormData({ ...formData, medio: e.target.value })}>
                      <option value="">Seleccionar…</option>
                      {mediosDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="mf-field">
                    <div className="mf-label">Banco</div>
                    <select className="mf-select" value={formData.banco} onChange={e => setFormData({ ...formData, banco: e.target.value })}>
                      <option value="">Sin banco</option>
                      {bancosDisponibles.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>

                {/* ── 4. Moneda + Precio ── */}
                <div className="mf-row">
                  <div className="mf-field">
                    <div className="mf-label">Moneda</div>
                    <select className="mf-select" value={selectedCurrency} onChange={handleCurrencyChange}>
                      {MONEDAS.map(c => <option key={c.code} value={c.code}>{c.symbol} - {c.label}</option>)}
                    </select>
                  </div>
                  <div className="mf-field">
                    <div className="mf-label">Precio {showHelperText && !formData.precio && <span className="mf-error">*</span>}</div>
                    <div className="mf-input-prefix">
                      <span className="mf-prefix">{getCurrencySymbol(selectedCurrency)}</span>
                      <input className="mf-input no-left-radius" type="number" step="0.01" min="0" placeholder="0,00"
                        value={formData.precio} onChange={e => setFormData({ ...formData, precio: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* ── 5a. Si fijo: Rep + Periodo ── */}
                {formData.isFijo && (
                  <div className="mf-row">
                    <div className="mf-field">
                      <div className="mf-label">Rep. en el mes</div>
                      <input className="mf-input" type="number" min="1" placeholder="1"
                        value={formData.cantidad} onChange={e => setFormData({ ...formData, cantidad: e.target.value })} />
                    </div>
                    <div className="mf-field">
                      <div className="mf-label">Periodo en meses</div>
                      <input className="mf-input" type="number" min="1" placeholder="12"
                        value={formData.cuotas} onChange={e => setFormData({ ...formData, cuotas: e.target.value })} />
                    </div>
                  </div>
                )}

                {/* ── 5b. Si variable: Tipo de pago ── */}
                {!formData.isFijo && formData.medio !== 'Efectivo' && formData.medio !== 'Transferencia' && (
                  <div className="mf-section-full">
                    <div className="mf-label">Tipo de pago</div>
                    <div className="mf-pill-row">
                      {[
                        { key: 'debito',  icon: <BsCreditCard2Front size={16} />, label: 'Débito' },
                        { key: 'credito', icon: <FaCreditCard size={16} />,       label: 'Crédito' },
                      ].map(op => {
                        const active = formData.tipo === op.key;
                        return (
                          <button key={op.key} type="button" className={`mf-pill-btn${active ? ' active' : ''}`}
                            onClick={() => setFormData({ ...formData, tipo: op.key, cuotas: op.key === 'debito' ? 1 : formData.cuotas })}>
                            {op.icon} {op.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── 6. Si crédito: Cuotas chips ── */}
                {!formData.isFijo && formData.tipo === 'credito' && (
                  <div className="mf-section-full">
                    <div className="mf-label">Cuotas</div>
                    <div className="mf-cuotas-row">
                      {[1, 3, 6, 12, 18, 24].map(c => {
                        const active = Number(formData.cuotas) === c;
                        return (
                          <button key={c} type="button" className={`mf-cuota-chip${active ? ' active' : ''}`}
                            onClick={() => setFormData({ ...formData, cuotas: c })}>
                            {c}x
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── 7. Etiqueta ── */}
                {mydata?.etiquetas?.length > 0 && (
                  <div className="mf-section-full">
                    <div className="mf-label">Etiqueta</div>
                    <div className="mf-tags">
                      {mydata.etiquetas.map(tag => {
                        const nombre = typeof tag === 'string' ? tag : tag.nombre;
                        const color  = typeof tag === 'string' ? 'var(--color-primary)' : (tag.color || 'var(--color-primary)');
                        const active = formData.etiqueta === nombre;
                        return (
                          <button key={nombre} type="button"
                            className="mf-tag"
                            style={{ borderColor: color, background: active ? color : color + '22', color: active ? '#fff' : color }}
                            onClick={() => setFormData({ ...formData, etiqueta: active ? '' : nombre })}>
                            {nombre}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── 8. Compartir gasto ── */}
                {(
                  <div className="share-card mf-section-full">
                    <div className="share-card-title">
                      <IoPeopleOutline size={13} /> Compartir gasto
                    </div>
                    {formData.compartidoConNombre ? (
                      <p style={{ fontSize: 12, fontStyle: 'italic', margin: 0, opacity: 0.65 }}>
                        Ya compartido con <strong>{formData.compartidoConNombre}</strong>.
                      </p>
                    ) : sharedUser ? (
                      <>
                        <div className="share-user-info">
                          <div className="share-avatar">{(sharedUser.nombre || sharedUser.email)[0].toUpperCase()}</div>
                          <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{sharedUser.nombre || sharedUser.email}</span>
                          <button className="share-remove-btn" onClick={() => setSharedUser(null)}><IoCloseCircle size={20} /></button>
                        </div>
                        <div className="share-mode-row">
                          <button className={`share-mode-btn${shareMode === 'dividir' ? ' active' : ''}`} onClick={() => setShareMode('dividir')}>Dividir entre 2</button>
                          <button className={`share-mode-btn${shareMode === 'mismo' ? ' active' : ''}`} onClick={() => setShareMode('mismo')}>Mismo monto</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="share-search-row">
                          <input className="share-email-input" type="email" placeholder="Email del contacto..."
                            value={searchEmail} onChange={e => setSearchEmail(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearchUser()} />
                          <button className="share-search-btn" onClick={handleSearchUser} disabled={searching}>
                            {searching ? '…' : <IoSearchOutline size={16} />}
                          </button>
                        </div>
                        {recentContacts.length > 0 && (
                          <div className="share-recent-contacts">
                            {recentContacts.map(c => (
                              <button key={c.id} className="share-recent-pill" onClick={() => setSharedUser(c)}>
                                {c.nombre || c.email.split('@')[0]}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
            {modalType === 'fondos' && (
              <>
                {/* Saldo actual */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.35)',
                  borderRadius: 14,
                  padding: '10px 20px',
                  marginBottom: 14,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                }}>
                  <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 2 }}>
                    Saldo actual
                  </span>
                  <span style={{ fontSize: 26, fontWeight: 800, color: parseFloat(mydata.fondos) < 0 ? '#c0392b' : 'rgba(0,0,0,0.72)' }}>
                    {getCurrencySymbol('ARS')}{parseFloat(mydata.fondos || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Toggle modo */}
                <div style={{ display: 'flex', gap: 8, width: '100%', marginBottom: 4 }}>
                  <Button
                    variant={!showSumInput ? 'contained' : 'outlined'}
                    onClick={() => setShowSumInput(false)}
                    fullWidth
                    size="small"
                    sx={{ borderRadius: 8, textTransform: 'none', fontWeight: 600, fontSize: 13 }}
                  >
                    Establecer total
                  </Button>
                  <Button
                    variant={showSumInput ? 'contained' : 'outlined'}
                    onClick={() => setShowSumInput(true)}
                    fullWidth
                    size="small"
                    sx={{ borderRadius: 8, textTransform: 'none', fontWeight: 600, fontSize: 13 }}
                  >
                    Sumar monto
                  </Button>
                </div>

                {!showSumInput ? (
                  <TextField
                    label="Nuevo saldo"
                    type="number"
                    step="0.01"
                    variant="outlined"
                    value={mydata.fondos}
                    onChange={(e) => setMyData({ ...mydata, fondos: e.target.value })}
                    min="0"
                    required
                    fullWidth
                    margin="normal"
                    helperText={showHelperText && (mydata.fondos === '' || mydata.fondos === null || mydata.fondos === undefined) ? "Ingrese el nuevo saldo" : "Reemplaza el saldo actual con este valor"}
                    InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                    sx={fieldSx(mydata.fondos)}
                    autoFocus
                  />
                ) : (
                  <>
                    <TextField
                      label="Monto a sumar"
                      type="number"
                      step="0.01"
                      variant="outlined"
                      value={additionalFunds}
                      onChange={(e) => setAdditionalFunds(e.target.value)}
                      min="0"
                      required
                      fullWidth
                      margin="normal"
                      helperText={showHelperText && !additionalFunds ? "Ingrese el monto a sumar" : ""}
                      InputProps={{ startAdornment: <InputAdornment position="start">+$</InputAdornment> }}
                      sx={fieldSx(additionalFunds)}
                      autoFocus
                    />
                    {additionalFunds !== '' && !isNaN(parseFloat(additionalFunds)) && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: 'rgba(255,255,255,0.4)',
                        borderRadius: 10,
                        padding: '7px 14px',
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'rgba(0,0,0,0.65)',
                      }}>
                        <span>{getCurrencySymbol('ARS')}{parseFloat(mydata.fondos || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span style={{ color: '#27ae60' }}>+</span>
                        <span style={{ color: '#27ae60' }}>{getCurrencySymbol('ARS')}{parseFloat(additionalFunds).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span>=</span>
                        <strong style={{ color: '#155a2c', fontSize: 16 }}>
                          {getCurrencySymbol('ARS')}{(parseFloat(mydata.fondos || 0) + parseFloat(additionalFunds)).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
            {modalType === 'vencimiento' && (
              <div className="modal-align">
                {!mydata.cierre || mydata.cierre === '' || mydata.cierre < new Date().toISOString().split('T')[0] ?
                  <p style={{ color: "#ffbf00" }}>¡Atención! Es necesario agregar la fecha de cierre de tu tarjeta</p>
                  : null
                }
                <TextField
                  label="Fecha de cierre"
                  type="date"
                  variant="outlined"
                  value={tempCierre || mydata.cierre}
                  onChange={(e) => setTempCierre(e.target.value)}
                  required
                  fullWidth
                  helperText={showHelperText && !tempCierre ? "Ingrese la fecha de cierre" : ""}
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  sx={fieldSx(tempCierre)}
                />
              </div>
            )}
            {modalType === 'crearEtiqueta' && (
              <div className='etiqueta-align'>
                <TextField
                  label="Etiqueta"
                  variant="outlined"
                  value={formData.etiqueta}
                  onChange={(e) => setFormData({ ...formData, etiqueta: e.target.value })}
                  required
                  fullWidth={false}
                  margin="normal"
                  helperText={showHelperText && !formData.etiqueta ? "Ingrese el nombre de la etiqueta" : ""}
                  sx={fieldSx(formData.etiqueta)}
                />
                <h3 style={{ color: '#FFFFFF' }}>Color del Grupo</h3>
                <CirclePicker
                  color={selectedColor}
                  onChangeComplete={handleColorChange}
                  colors={["#0A1172", // Azul Profundo
                    "#0D47A1", // Azul Cobalto
                    "#1976D2", // Azul Brillante
                    "#42A5F5", // Celeste
                    "#81D4FA", // Azul Pastel
                    "#00838F", // Turquesa Oscuro
                    "#00ACC1", // Turquesa Medio
                    "#26C6DA", // Turquesa Claro
                    "#004D40", // Verde Azulado Oscuro
                    "#00796B", // Verde Esmeralda
                    "#009688", // Verde Agua
                    "#4DB6AC", // Verde Menta
                    "#8BC34A", // Verde Lima
                    "#C0CA33", // Verde Oliva Claro
                    "#FDD835", // Amarillo Dorado
                    "#FFEB3B", // Amarillo Brillante
                    "#FFC107", // Ámbar
                    "#FF9800", // Naranja Medio
                    "#FF6F00", // Naranja Intenso
                    "#E65100", // Naranja Oscuro
                    "#D84315", // Rojo Anaranjado
                    "#D32F2F", // Rojo Carmesí
                    "#C2185B", // Rojo Rubí
                    "#AD1457", // Rojo Vino
                    "#880E4F", // Borgoña
                    "#6A1B9A", // Morado Intenso
                    "#8E24AA", // Morado Vibrante
                    "#AB47BC", // Lavanda Oscura
                    "#CE93D8", // Lavanda Clara
                    "#E1BEE7"  // Lila Pastel
                  ]}
                />
              </div>
            )}
            {modalType === 'presupuesto' && (
              <div className="presupuesto-container">
                {/* ================================================= */}
                {/* 📊 RESUMEN + PRESUPUESTO MENSUAL (FULL WIDTH) */}
                {/* ================================================= */}

                {(() => {
                  const totalPresupuestado = Object.entries(mydata.presupuestos || {}).reduce(
                    (acc, [_, data]) => {
                      if (data?.visible === false) return acc;
                      return acc + Number(data?.monto || 0);
                    },
                    0
                  );

                  const presupuestoMax = Number(mydata.presupuestoMensualMax || 0);

                  const totalGastadoUSD = parseFloat(totalGastado?.USD || 0);
                  const totalGastadoConvertido = parseFloat(totalGastado?.ARS || 0) +
                    (usdToArs && totalGastadoUSD ? totalGastadoUSD * usdToArs : 0);

                  const { porcentaje, color, mensaje } =
                    getEstadoPresupuesto(totalGastadoConvertido, presupuestoMax);

                  const excedido =
                    presupuestoMax > 0 && totalGastadoConvertido > presupuestoMax;

                  return (
                    <div
                      className="presupuesto-card"
                      style={{
                        borderLeft: '6px solid #ffffff',
                        flexBasis: '100%',
                        marginBottom: 10,
                        padding: 15
                      }}
                    >
                      {/* 🧠 HEADER */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12,
                          flexWrap: 'wrap'
                        }}
                      >
                        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>
                          📊 Presupuesto mensual
                        </h1>

                        <TextField
                          label="Máximo mensual"
                          type="number"
                          size="small"
                          value={presupuestoMax || ''}
                          onChange={(e) => {
                            const updated = {
                              ...mydata,
                              presupuestoMensualMax: Number(e.target.value)
                            };
                            setMyData(updated);
                            saveMyData(updated);
                          }}
                        />
                      </div>

                      {/* 🚦 ESTADO */}
                      <p
                        className="text-sm font-medium"
                        style={{ color, marginTop: 6 }}
                      >
                        {mensaje}
                      </p>

                      {/* 💸 RESUMEN */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 12,
                          flexWrap: 'wrap',
                          marginTop: 6
                        }}
                      >
                        <p style={{ margin: 0 }}>
                          💸 Gastado: <strong>$ {formatARS(totalGastadoConvertido.toFixed(2))}</strong>
                          {totalGastadoUSD > 0 && usdToArs && (
                            <small style={{ color: 'var(--color-text-muted)', marginLeft: 6 }}>
                              (incl. US${formatARS(totalGastadoUSD.toFixed(2))} × ${formatARS(usdToArs)})
                            </small>
                          )}
                        </p>

                        <p style={{ margin: 0 }}>
                          🏦 Presupuesto Máximo:{' '}
                          <strong>
                            $ {formatARS(presupuestoMax > 0 ? presupuestoMax : totalPresupuestado)}
                          </strong>
                        </p>

                        <p style={{ margin: 0 }}>
                          🎯 Presupuestado: <strong>$ {formatARS(totalPresupuestado)}</strong>
                        </p>

                        <p style={{ margin: 0 }}>
                          ✅ Disponible:{' '}
                          <strong>
                            $ {formatARS(
                              presupuestoMax > 0
                                ? (presupuestoMax - totalGastadoConvertido).toFixed(2)
                                : (totalPresupuestado - totalGastadoConvertido).toFixed(2)
                            )}
                          </strong>
                        </p>

                      </div>

                      {/* 📊 BARRA */}
                      <div className="barra" style={{ marginTop: 8 }}>
                        <div
                          className="barra-progreso"
                          style={{
                            width: `${porcentaje}%`,
                            background: excedido
                              ? 'linear-gradient(90deg, #e53935, #ff7043)'
                              : `linear-gradient(90deg, ${color}, ${color}aa)`
                          }}
                        />
                      </div>

                      {presupuestoMax > 0 && (
                        <small>{porcentaje.toFixed(0)}%</small>
                      )}

                      {/* 👁️ ETIQUETAS OCULTAS (EN FILA) */}
                      {etiquetasOcultas.length > 0 && (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: 8,
                            marginTop: 10,
                            alignItems: 'center'
                          }}
                        >
                          {etiquetasOcultas.map(e => (
                            <Button
                              key={e.nombre}
                              size="small"
                              startIcon={<IoAddCircleOutline />}
                              onClick={() => mostrarEtiqueta(e.nombre)}
                              color="#ffffff"
                              sx={{
                                whiteSpace: 'nowrap',
                                minWidth: 'auto'
                              }}
                            >
                              {e.nombre}
                            </Button>
                          ))}
                        </div>
                      )}

                    </div>
                  );
                })()}

                {/* ================================================= */}
                {/* 📌 PRESUPUESTOS POR ETIQUETA */}
                {/* ================================================= */}

                {mydata.etiquetas.map(et => {
                  const nombre = et.nombre;
                  const colorEtiqueta = et.color || '#ffffff';

                  const presupuestoData = mydata.presupuestos?.[nombre] || {};
                  const visible = presupuestoData.visible !== false;
                  if (!visible) return null;

                  const gastadoARS = Number(gastosPorEtiqueta?.[nombre]?.ARS || 0);
                  const gastadoUSD = Number(gastosPorEtiqueta?.[nombre]?.USD || 0);
                  const gastado = gastadoARS + (usdToArs && gastadoUSD ? gastadoUSD * usdToArs : 0);
                  const presupuesto = Number(presupuestoData.monto || 0);

                  const excedido = presupuesto > 0 && gastado > presupuesto;

                  const { porcentaje, color, mensaje } =
                    getEstadoPresupuesto(gastado, presupuesto);

                  return (
                    <div
                      key={nombre}
                      className={`presupuesto-card ${excedido ? 'excedido' : ''}`}
                      style={{ borderLeft: `5px solid ${colorEtiqueta}` }}
                    >
                      {/* 🏷️ NOMBRE */}
                      <h3
                        style={{
                          color: colorEtiqueta,
                          fontSize: '1.05rem',
                          marginBottom: 2
                        }}
                      >
                        {nombre}
                      </h3>

                      {/* 🚦 ESTADO */}
                      <p
                        style={{
                          color,
                          fontSize: '0.75rem',
                          margin: '2px 0 6px',
                          fontWeight: 600
                        }}
                      >
                        {mensaje}
                      </p>

                      {/* 💸 DATOS */}

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 12,
                          flexWrap: 'wrap',
                          marginTop: 6

                        }}
                      >
                        <p style={{ margin: 0, fontSize: '1rem' }}>
                          💸 Gastado: <strong>$ {formatARS(gastado.toFixed(2))}</strong>
                          {gastadoUSD > 0 && usdToArs && (
                            <small style={{ color: 'var(--color-text-muted)', marginLeft: 6 }}>
                              (incl. US${formatARS(gastadoUSD.toFixed(2))} × ${formatARS(usdToArs)})
                            </small>
                          )}
                        </p>

                        <p style={{ margin: 0, fontSize: '1rem' }}>
                          🎯 Presupuestado: <strong>$ {formatARS(presupuesto || 0)}</strong>
                        </p>
                      </div>
                      {/* 📊 BARRA */}
                      <div className="barra" style={{ height: 6, marginBottom: 6 }}>
                        <div
                          className="barra-progreso"
                          style={{
                            width: `${porcentaje}%`,
                            background: excedido
                              ? 'linear-gradient(90deg, #e53935, #ff7043)'
                              : `linear-gradient(90deg, ${color}, ${color}aa)`
                          }}
                        />
                      </div>

                      {/* % */}
                      {presupuesto > 0 && (
                        <small style={{ fontSize: '0.7rem' }}>
                          {porcentaje.toFixed(0)}%
                        </small>
                      )}

                      {/* ✏️ INPUT */}
                      <TextField
                        label="Presupuesto"
                        type="number"
                        size="small"
                        value={presupuesto || ''}
                        onChange={(e) =>
                          actualizarPresupuesto(nombre, {
                            monto: Number(e.target.value),
                            visible: true
                          })
                        }
                        fullWidth
                        margin="dense"
                      />

                      {/* 👁️ OCULTAR */}
                      <Button
                        size="small"
                        color="#ffffff"
                        onClick={() => ocultarEtiqueta(nombre)}
                        startIcon={<IoEyeOffOutline />}
                      >
                        Ocultar
                      </Button>
                    </div>
                  );
                })}

              </div>
            )}


          </form>
          {modalType !== 'eliminar' && modalType !== 'reporte' && modalType !== 'presupuesto' && modalType !== 'eliminarEtiqueta' && (
            <div className="alignBottom">
              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
                fullWidth
                startIcon={<IoSaveOutline />}
              >
                Guardar
              </Button>
            </div>
          )}
          {modalType === 'eliminar' && (
            <>
              <p>¿ Estás seguro de que deseas eliminar: <span style={{ color: '#c30000' }}>{formData.objeto}</span> ?</p>
              <div className="button-group">
                <Button variant="contained" color="primary" onClick={() => setModalVisible(false)}>Cancelar</Button>
                <Button variant="contained" color="error" onClick={handleDelete}>Eliminar</Button>
              </div>
            </>
          )}
          {modalType === 'eliminarEtiqueta' && (
            <>
              <p>¿ Estás seguro de que deseas eliminar: <span style={{ color: '#c30000' }}>{formData.etiqueta}</span> ?</p>
              <div className="button-group">
                <Button variant="contained" color="primary" onClick={() => setModalVisible(false)}>Cancelar</Button>
                <Button variant="contained" color="error" onClick={handleDeleteEtiqueta}>Eliminar</Button>
              </div>
            </>
          )}
          {
            modalType === 'reporte' && (
              <div>
                <Dashboard data={data} mydata={mydata} />
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}

export default Modal;