// src/pages/ViajeDetallePage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Header from '../components/Navbar';
import Footer from '../components/Footer';
import ViajeDetalleSkeleton from '../components/ViajeDetalleSkeleton';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { viajesService } from '../services/viajesService';
import { viajeGastosService } from '../services/viajeGastosService';
import { viajePagosService } from '../services/viajePagosService';
import { viajeNotasService } from '../services/viajeNotasService';
import ViajeGastoModal from '../components/viajes/ViajeGastoModal';
import RegistrarPagoModal from '../components/viajes/RegistrarPagoModal';
import CrearViajeModal from '../components/viajes/CrearViajeModal';
import { IoArrowBack, IoEllipsisVertical, IoAddOutline, IoTrashOutline, IoLockClosedOutline, IoAddCircleOutline, IoCheckmark, IoEllipseOutline, IoCheckmarkCircle, IoCheckmarkCircleOutline, IoImageOutline } from 'react-icons/io5';
import { FiArrowRight } from 'react-icons/fi';
import ImagenGaleriaModal from '../components/viajes/ImagenGaleriaModal';
import '../styles/modal.css';
import '../styles/viajes.css';

const PARTICIPANT_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const MAX_AVATARS = 4;
const TABS = ['💸 Gastos', '⚖️ Balance', '✅ Notas'];

function getColor(participantes, userId) {
  const idx = participantes.findIndex(p => p.userId === userId);
  return PARTICIPANT_COLORS[Math.max(0, idx) % PARTICIPANT_COLORS.length];
}

function parseFecha(dateStr) {
  if (!dateStr) return null;
  if (dateStr.includes('/')) {
    const [d, m, y] = dateStr.split('/');
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  const [y, m, d] = dateStr.split('T')[0].split('-');
  return new Date(Number(y), Number(m) - 1, Number(d));
}

function formatDateSep(dateStr) {
  const d = parseFecha(dateStr);
  if (!d) return 'Sin fecha';
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return 'Hoy';
  if (sameDay(d, yesterday)) return 'Ayer';
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

function groupGastos(gastos) {
  const sorted = [...gastos].sort((a, b) => {
    const da = parseFecha(a.fecha), db = parseFecha(b.fecha);
    if (!da && !db) return 0; if (!da) return 1; if (!db) return -1;
    return db - da;
  });
  const items = [];
  let lastKey = null;
  for (const g of sorted) {
    const key = g.fecha ? g.fecha.slice(0, 10) : 'sin-fecha';
    if (key !== lastKey) { items.push({ type: 'sep', label: formatDateSep(g.fecha), key: `sep-${key}-${items.length}` }); lastKey = key; }
    items.push({ type: 'gasto', ...g });
  }
  return items;
}

// ── Tab Gastos ──────────────────────────────
function TabGastos({ viaje, gastos, onGastoAdded, onGastoDeleted, currentUserId }) {
  const addToast = useToast();
  const [gastoModal, setGastoModal] = useState(false);
  const activo = viaje.estado === 'activo';
  const items = groupGastos(gastos);

  const handleSaveGasto = async (gastoData, splitConfig) => {
    try {
      await viajeGastosService.agregarGasto(viaje.id, gastoData, splitConfig, viaje.participantes);
      setGastoModal(false);
      addToast('Gasto agregado', 'success');
      onGastoAdded();
    } catch {
      addToast('Error al agregar el gasto', 'error');
      throw new Error('save failed');
    }
  };

  const handleDelete = async (g) => {
    if (!window.confirm(`¿Eliminar "${g.objeto}"?`)) return;
    try {
      await viajeGastosService.eliminarGasto(g.id);
      addToast('Gasto eliminado', 'success');
      onGastoDeleted();
    } catch {
      addToast('Error al eliminar', 'error');
    }
  };

  return (
    <div>
      {items.length === 0 ? (
        <div className="viajes-empty" style={{ paddingTop: 'var(--space-8)' }}>
          <div className="viajes-empty-icon">💸</div>
          <div className="viajes-empty-title">Sin gastos todavía</div>
        </div>
      ) : (
        items.map(item => {
          if (item.type === 'sep') return <div key={item.key} className="viaje-gasto-sep">{item.label}</div>;
          const n = item.participantes.length || viaje.participantes.length;
          const splitText = item.modoSplit === 'solo' ? 'solo él/ella' : `÷ ${n} personas`;
          const color = getColor(viaje.participantes, item.pagadoPor);
          return (
            <div key={item.id} className="viaje-gasto-row">
              <div className="viaje-gasto-avatar" style={{ background: color }}>
                {item.pagadorNombre?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="viaje-gasto-body">
                <div className="viaje-gasto-objeto">{item.objeto}</div>
                <div className="viaje-gasto-meta">{item.pagadorNombre} · {splitText}</div>
              </div>
              <div className="viaje-gasto-right">
                <div className="viaje-gasto-monto">${Number(item.precio).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                {item.modoSplit !== 'solo' && n > 1 && (
                  <div className="viaje-gasto-ppp">${(item.precio / n).toLocaleString('es-AR', { minimumFractionDigits: 2 })} c/u</div>
                )}
              </div>
              {activo && (
                <button className="viaje-gasto-del-btn" onClick={() => handleDelete(item)} title="Eliminar">
                  <IoTrashOutline size={16} />
                </button>
              )}
            </div>
          );
        })
      )}

      {activo && (
        <button className="viaje-fab" onClick={() => setGastoModal(true)}>
          <IoAddOutline size={20} /> Agregar gasto
        </button>
      )}

      {gastoModal && (
        <ViajeGastoModal
          viaje={viaje}
          currentUserId={currentUserId}
          onClose={() => setGastoModal(false)}
          onSave={handleSaveGasto}
        />
      )}
    </div>
  );
}

// ── Tab Balance ─────────────────────────────
function TabBalance({ viaje, gastos, pagos, onRefresh }) {
  const [pagoModal, setPagoModal] = useState(null);
  const { porPersona, liquidacion } = viajeGastosService.calcularBalance(gastos, viaje.participantes, pagos);
  const maxTotal = Math.max(...porPersona.map(p => p.total), 1);
  const activo = viaje.estado === 'activo';

  return (
    <div>
      <div className="viaje-section-label">Cuánto puso cada uno</div>
      {porPersona.map(p => {
        const color = getColor(viaje.participantes, p.userId);
        const netoClass = p.neto > 0.01 ? 'pos' : p.neto < -0.01 ? 'neg' : 'zero';
        const netoStr = p.neto > 0.01 ? `+$${p.neto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` :
          p.neto < -0.01 ? `-$${Math.abs(p.neto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}` :
          `$${Math.abs(p.neto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
        return (
          <div key={p.userId} className="viaje-balance-card">
            <div className="viaje-balance-row">
              <div className="viaje-balance-avatar" style={{ background: color }}>
                {p.nombre?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div className="viaje-balance-nombre">{p.nombre}</div>
                <div className="viaje-balance-sub">Pagó ${p.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })} total</div>
              </div>
              <div className={`viaje-balance-neto ${netoClass}`}>{netoStr}</div>
            </div>
            <div className="viaje-balance-bar-bg">
              <div className="viaje-balance-bar-fill" style={{ width: `${(p.total / maxTotal) * 100}%`, background: color }} />
            </div>
            <div className="viaje-balance-bar-legend">
              <span>$0</span>
              <span>${maxTotal.toLocaleString('es-AR', { minimumFractionDigits: 0 })}</span>
            </div>
          </div>
        );
      })}

      {liquidacion.length > 0 ? (
        <>
          <div className="viaje-section-label">Transferencias pendientes</div>
          {liquidacion.map(t => (
            <div key={`${t.de}-${t.hacia}`} className="viaje-transfer-card">
              <div className="viaje-transfer-top">
                <div className="viaje-transfer-person">
                  <div className="viaje-balance-avatar" style={{ background: getColor(viaje.participantes, t.de) }}>
                    {t.deNombre?.[0]?.toUpperCase()}
                  </div>
                  <div className="viaje-transfer-name">{t.deNombre}</div>
                </div>
                <div className="viaje-transfer-arrow">
                  <FiArrowRight size={16} />
                  <span className="viaje-transfer-debe">debe</span>
                </div>
                <div className="viaje-transfer-person">
                  <div className="viaje-balance-avatar" style={{ background: getColor(viaje.participantes, t.hacia) }}>
                    {t.haciaNombre?.[0]?.toUpperCase()}
                  </div>
                  <div className="viaje-transfer-name">{t.haciaNombre}</div>
                </div>
              </div>
              <div className="viaje-transfer-bottom">
                <div className="viaje-transfer-monto">${t.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                {activo && (
                  <button className="viaje-pagar-btn" onClick={() => setPagoModal(t)}>
                    <IoCheckmark size={14} /> Registrar pago
                  </button>
                )}
              </div>
            </div>
          ))}
        </>
      ) : porPersona.length > 0 ? (
        <div className="viaje-saldado">
          <div className="viaje-saldado-icon">✅</div>
          <div className="viaje-saldado-text">Todo está saldado</div>
        </div>
      ) : null}

      {pagos.length > 0 && (
        <>
          <div className="viaje-section-label">Pagos registrados</div>
          {pagos.map(p => {
            const pagadorNombre = viaje.participantes.find(x => x.userId === p.pagadorId)?.nombre || p.pagadorId.slice(0, 8);
            const receptorNombre = viaje.participantes.find(x => x.userId === p.receptorId)?.nombre || p.receptorId.slice(0, 8);
            return (
              <div key={p.id} className="viaje-pago-row">
                <div className="viaje-balance-avatar" style={{ width: 28, height: 28, fontSize: 11, background: getColor(viaje.participantes, p.pagadorId) }}>
                  {pagadorNombre[0]?.toUpperCase()}
                </div>
                <div className="viaje-pago-names">{pagadorNombre} → {receptorNombre}</div>
                <div className="viaje-pago-badge">${p.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
              </div>
            );
          })}
        </>
      )}

      <RegistrarPagoModal
        visible={!!pagoModal}
        onClose={() => setPagoModal(null)}
        onSuccess={() => { setPagoModal(null); onRefresh(); }}
        viaje={viaje}
        transaccion={pagoModal}
      />
    </div>
  );
}

// ── Tab Notas ───────────────────────────────
function TabNotas({ viaje, currentUserId }) {
  const addToast = useToast();
  const activo = viaje.estado === 'activo';
  const [checklist, setChecklist] = useState([]);
  const [notas, setNotas] = useState([]);
  const [nuevoItem, setNuevoItem] = useState('');
  const [nuevaNota, setNuevaNota] = useState('');
  const [showItemInput, setShowItemInput] = useState(false);
  const [showNotaInput, setShowNotaInput] = useState(false);
  const [loadingNotas, setLoadingNotas] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const [cl, nt] = await Promise.all([
        viajeNotasService.getChecklist(viaje.id),
        viajeNotasService.getNotas(viaje.id),
      ]);
      setChecklist(cl);
      setNotas(nt);
    } catch {
      // silently ignore
    } finally {
      setLoadingNotas(false);
    }
  }, [viaje.id]);

  useEffect(() => {
    cargar();
    const channel = viajeNotasService.subscribeChecklist(viaje.id, cargar);
    return () => { channel.unsubscribe(); };
  }, [viaje.id, cargar]);

  const handleToggle = async (item) => {
    const marcar = !(item.completadosPor ?? []).includes(currentUserId);
    try {
      await viajeNotasService.toggleItem(item.id, currentUserId, marcar);
      setChecklist(prev => prev.map(i => i.id === item.id ? {
        ...i,
        completadosPor: marcar
          ? [...new Set([...(i.completadosPor || []), currentUserId])]
          : (i.completadosPor || []).filter(id => id !== currentUserId),
      } : i));
    } catch { addToast('Error al actualizar', 'error'); }
  };

  const handleAgregarItem = async () => {
    if (!nuevoItem.trim()) return;
    try {
      await viajeNotasService.agregarItem(viaje.id, nuevoItem.trim(), currentUserId);
      setNuevoItem(''); setShowItemInput(false);
      cargar();
    } catch { addToast('Error al agregar', 'error'); }
  };

  const handleEliminarItem = async (id) => {
    try { await viajeNotasService.eliminarItem(id); cargar(); }
    catch { addToast('Error al eliminar', 'error'); }
  };

  const handleAgregarNota = async () => {
    if (!nuevaNota.trim()) return;
    try {
      await viajeNotasService.agregarNota(viaje.id, nuevaNota.trim(), currentUserId);
      setNuevaNota(''); setShowNotaInput(false);
      cargar();
    } catch { addToast('Error al agregar', 'error'); }
  };

  const handleEliminarNota = async (id) => {
    try { await viajeNotasService.eliminarNota(id); cargar(); }
    catch { addToast('Error al eliminar', 'error'); }
  };

  if (loadingNotas) return <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>Cargando…</div>;

  return (
    <div>
      {/* Checklist */}
      <div className="viaje-notas-section-header">
        <div className="viaje-section-label" style={{ margin: 0 }}>Qué llevar</div>
        {activo && (
          <button className="viaje-notas-add-btn" onClick={() => setShowItemInput(v => !v)}>
            <IoAddCircleOutline size={22} />
          </button>
        )}
      </div>

      {showItemInput && activo && (
        <div className="viaje-notas-input-row">
          <input
            className="viaje-notas-input"
            placeholder="Ej: Protector solar..."
            value={nuevoItem}
            onChange={e => setNuevoItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAgregarItem()}
            autoFocus
          />
          <button className="viaje-notas-input-submit" onClick={handleAgregarItem}>
            <IoCheckmark size={18} />
          </button>
        </div>
      )}

      {checklist.map(item => {
        const completadosPor = item.completadosPor ?? [];
        const completadoPorMi = completadosPor.includes(currentUserId);
        const pendientes = viaje.participantes.filter(p => !completadosPor.includes(p.userId));
        const todosCompletaron = viaje.participantes.length > 0 && pendientes.length === 0;
        const alguienMarcó = completadosPor.length > 0;
        const CheckIcon = todosCompletaron ? IoCheckmarkCircle : completadoPorMi ? IoCheckmarkCircleOutline : IoEllipseOutline;

        return (
          <div key={item.id} className="viaje-checklist-item" onClick={() => handleToggle(item)}>
            <CheckIcon size={22} className={`viaje-checklist-check${todosCompletaron || completadoPorMi ? ' done' : ''}`} />
            <div style={{ flex: 1 }}>
              <div className={`viaje-checklist-texto${todosCompletaron ? ' done' : ''}`}>{item.texto}</div>
              {!todosCompletaron && alguienMarcó && (
                <div className="viaje-checklist-esperando">
                  Esperando a: {pendientes.map(p => p.nombre.split(' ')[0]).join(', ')}
                </div>
              )}
            </div>
            <span className="viaje-checklist-autor">{item.autorNombre.split(' ')[0]}</span>
            {item.createdBy === currentUserId && activo && (
              <button className="viaje-checklist-del" onClick={e => { e.stopPropagation(); handleEliminarItem(item.id); }}>
                <IoTrashOutline size={14} />
              </button>
            )}
          </div>
        );
      })}

      <div style={{ height: 'var(--space-5)' }} />

      {/* Notas */}
      <div className="viaje-notas-section-header">
        <div className="viaje-section-label" style={{ margin: 0 }}>Notas del grupo</div>
        {activo && (
          <button className="viaje-notas-add-btn" onClick={() => setShowNotaInput(v => !v)}>
            <IoAddCircleOutline size={22} />
          </button>
        )}
      </div>

      {showNotaInput && activo && (
        <div className="viaje-notas-input-row">
          <textarea
            className="viaje-notas-input"
            placeholder="Escribe una nota..."
            value={nuevaNota}
            onChange={e => setNuevaNota(e.target.value)}
            autoFocus
          />
          <button className="viaje-notas-input-submit" onClick={handleAgregarNota}>
            <IoCheckmark size={18} />
          </button>
        </div>
      )}

      {notas.map(nota => {
        const color = getColor(viaje.participantes, nota.createdBy);
        return (
          <div key={nota.id} className="viaje-nota-card">
            <div className="viaje-nota-header">
              <span className="viaje-nota-autor" style={{ color }}>{nota.autorNombre}</span>
              <span className="viaje-nota-ts">
                {new Date(nota.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
              </span>
              {nota.createdBy === currentUserId && activo && (
                <button className="viaje-nota-del" onClick={() => handleEliminarNota(nota.id)}>
                  <IoTrashOutline size={14} />
                </button>
              )}
            </div>
            <div className="viaje-nota-texto">{nota.texto}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ───────────────────────────────
export default function ViajeDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addToast = useToast();
  const { user } = useAuth();

  const [viaje, setViaje] = useState(null);
  const [gastos, setGastos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabIdx, setTabIdx] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [galeriaModal, setGaleriaModal] = useState(false);
  const menuRef = useRef(null);

  const cargar = useCallback(async () => {
    try {
      const [v, g, p] = await Promise.all([
        viajesService.getById(id),
        viajeGastosService.getByViaje(id),
        viajePagosService.getByViaje(id),
      ]);
      setViaje(v); setGastos(g); setPagos(p);
    } catch {
      addToast('Error al cargar el viaje', 'error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCerrar = async () => {
    setMenuOpen(false);
    if (!window.confirm('¿Cerrar el viaje? Se generarán los gastos de resumen para cada participante.')) return;
    try {
      await viajesService.cerrar(id);
      addToast('Viaje cerrado', 'success');
      cargar();
    } catch (e) {
      addToast(e.message || 'Error al cerrar el viaje', 'error');
    }
  };

  const handleReabrir = async () => {
    setMenuOpen(false);
    if (!window.confirm('¿Reabrir el viaje? Se eliminarán los gastos de resumen generados.')) return;
    try {
      await viajesService.reabrir(id);
      addToast('Viaje reabierto', 'success');
      cargar();
    } catch {
      addToast('Error al reabrir el viaje', 'error');
    }
  };

  const handleEliminar = async () => {
    setMenuOpen(false);
    if (!window.confirm('¿Eliminar este viaje? Esta acción no se puede deshacer.')) return;
    try {
      await viajesService.eliminar(id);
      addToast('Viaje eliminado', 'success');
      navigate('/viajes');
    } catch {
      addToast('Error al eliminar', 'error');
    }
  };

  const handleEditSave = async (titulo, emoji) => {
    try {
      await viajesService.editarViaje(id, { titulo, emoji });
      setEditModal(false);
      addToast('Viaje actualizado', 'success');
      cargar();
    } catch {
      addToast('Error al actualizar', 'error');
      throw new Error('edit failed');
    }
  };

  const handleImagenSave = async (imagenUrl) => {
    await viajesService.editarViaje(id, { imagenUrl });
    addToast(imagenUrl ? 'Imagen actualizada' : 'Imagen eliminada', 'success');
    cargar();
  };

  if (loading) return <ViajeDetalleSkeleton />;
  if (!viaje) return null;

  const activo = viaje.estado === 'activo';
  const totalGastado = gastos.reduce((s, g) => s + g.precio, 0);
  const porPersona = viaje.participantes.length > 0 ? totalGastado / viaje.participantes.length : 0;
  const visibleParticipants = viaje.participantes.slice(0, MAX_AVATARS);
  const overflowCount = viaje.participantes.length - MAX_AVATARS;

  const fmtARS = (n) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="viaje-detalle-wrap">
      <Header />
      <main className="viaje-detalle-main">

        {/* ── Full-width hero header ── */}
        <div
          className="viaje-hero"
          style={viaje.imagenUrl ? { backgroundImage: `url(${viaje.imagenUrl})` } : {}}
        >
          {/* gradient overlay */}
          <div className={`viaje-hero-gradient${viaje.imagenUrl ? ' img' : ''}`} />

          {/* hero content */}
          <div className="viaje-hero-content">
            {/* top bar: back + options */}
            <div className="viaje-hero-topbar">
              <Link to="/viajes" className="viaje-hero-btn">
                <IoArrowBack size={18} />
              </Link>
              <div style={{ position: 'relative' }} ref={menuRef}>
                <button className="viaje-hero-btn" onClick={() => setMenuOpen(o => !o)}>
                  <IoEllipsisVertical size={18} />
                </button>
                {menuOpen && (
                  <div className="viaje-options-menu">
                    <button className="viaje-options-item" onClick={() => { setMenuOpen(false); setEditModal(true); }}>
                      ✏️ Editar
                    </button>
                    <button className="viaje-options-item" onClick={() => { setMenuOpen(false); setGaleriaModal(true); }}>
                      <IoImageOutline size={14} /> Cambiar imagen de portada
                    </button>
                    {activo ? (
                      <button className="viaje-options-item" onClick={handleCerrar}>🔒 Cerrar viaje</button>
                    ) : (
                      <button className="viaje-options-item" onClick={handleReabrir}>🔓 Reabrir viaje</button>
                    )}
                    <button className="viaje-options-item danger" onClick={handleEliminar}>
                      <IoTrashOutline size={14} /> Eliminar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* emoji box */}
            <div className="viaje-hero-emoji-box">{viaje.emoji}</div>

            {/* title */}
            <div className="viaje-hero-titulo">{viaje.titulo}</div>

            {/* status badge */}
            <div className={`viaje-hero-badge${activo ? ' activo' : ' cerrado'}`}>
              {activo ? '● Activo' : '🔒 Archivado'}
            </div>

            {/* avatars */}
            <div className="viaje-hero-avatars">
              {visibleParticipants.map((p) => (
                <div
                  key={p.userId}
                  className="viaje-hero-avatar"
                  style={{ background: getColor(viaje.participantes, p.userId) }}
                  title={p.nombre}
                >
                  {p.nombre?.[0]?.toUpperCase()}
                </div>
              ))}
              {overflowCount > 0 && (
                <div className="viaje-hero-avatar overflow">+{overflowCount}</div>
              )}
            </div>

            {/* stat cards */}
            <div className="viaje-hero-stats">
              <div className="viaje-stat-card">
                <div className="viaje-stat-label">TOTAL</div>
                <div className="viaje-stat-value">${fmtARS(totalGastado)}</div>
                <div className="viaje-stat-sub">{gastos.length} gasto{gastos.length !== 1 ? 's' : ''}</div>
              </div>
              <div className="viaje-stat-card">
                <div className="viaje-stat-label">POR PERSONA</div>
                <div className="viaje-stat-value">${fmtARS(porPersona)}</div>
                <div className="viaje-stat-sub">{viaje.participantes.length} persona{viaje.participantes.length !== 1 ? 's' : ''}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Page body ── */}
        <div className="viaje-detalle-container">

          {/* Readonly banner */}
          {!activo && (
            <div className="viaje-readonly-banner" style={{ marginTop: 'var(--space-4)' }}>
              <IoLockClosedOutline size={14} /> Solo lectura · Viaje cerrado
            </div>
          )}

          {/* Segmented tabs */}
          <div className="viaje-seg-tabs">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                className={`viaje-seg-btn${tabIdx === i ? ' active' : ''}`}
                onClick={() => setTabIdx(i)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tabIdx === 0 && (
            <TabGastos viaje={viaje} gastos={gastos} onGastoAdded={cargar} onGastoDeleted={cargar} currentUserId={user?.id} />
          )}
          {tabIdx === 1 && (
            <TabBalance viaje={viaje} gastos={gastos} pagos={pagos} onRefresh={cargar} />
          )}
          {tabIdx === 2 && (
            <TabNotas viaje={viaje} currentUserId={user?.id} />
          )}

        </div>
      </main>
      <Footer />

      {editModal && (
        <CrearViajeModal
          viaje={viaje}
          onClose={() => setEditModal(false)}
          onSave={handleEditSave}
          currentUserId={user?.id}
          currentUserNombre={user?.user_metadata?.nombre || user?.email}
        />
      )}

      {galeriaModal && (
        <ImagenGaleriaModal
          viaje={viaje}
          onClose={() => setGaleriaModal(false)}
          onSave={handleImagenSave}
        />
      )}
    </div>
  );
}
