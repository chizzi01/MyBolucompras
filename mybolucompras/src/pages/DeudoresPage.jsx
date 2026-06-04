// src/pages/DeudoresPage.jsx
import React, { useState, useMemo } from 'react';
import Header from '../components/Navbar';
import Footer from '../components/Footer';
import PageSkeleton from '../components/PageSkeleton';
import { useToast } from '../components/Toast';
import { useDeudores } from '../context/DeudoresContext';
import DeudaModal from '../components/DeudaModal';
import { getCurrencySymbol } from '../utils/formatters';
import { calcularCuotasRestantes } from '../utils/cuotas';
import { IoAddOutline, IoSearchOutline, IoCheckmarkCircleOutline, IoPencilOutline, IoTrashOutline } from 'react-icons/io5';
import '../styles/deudores.css';

export default function DeudoresPage() {
  const addToast = useToast();
  const { deudas, loading, agregarDeuda, editarDeuda, marcarPagada, eliminarDeuda } = useDeudores();

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('todos'); // 'todos' | 'cobrar' | 'pagar'
  const [filtroMoneda, setFiltroMoneda] = useState('');
  const [mostrarPagadas, setMostrarPagadas] = useState(false);

  // ── Filtrado ──
  const deudasFiltradas = useMemo(() => {
    return deudas.filter(d => {
      if (!mostrarPagadas && d.pagado) return false;
      if (mostrarPagadas && !d.pagado) return false;
      if (filtroRol === 'cobrar' && !d.esAcreedor) return false;
      if (filtroRol === 'pagar' && d.esAcreedor) return false;
      if (filtroMoneda && d.moneda !== filtroMoneda) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        if (!d.nombre.toLowerCase().includes(q) && !d.descripcion.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [deudas, mostrarPagadas, filtroRol, filtroMoneda, busqueda]);

  // ── Agrupado por nombre ──
  const grupos = useMemo(() => {
    const map = {};
    deudasFiltradas.forEach(d => {
      const key = `${d.nombre.toLowerCase().trim()}__${d.esAcreedor}`;
      if (!map[key]) map[key] = { nombre: d.nombre, deudas: [] };
      map[key].deudas.push(d);
    });
    return Object.values(map);
  }, [deudasFiltradas]);

  // ── Totales resumen ──
  const { totalCobrar, totalPagar } = useMemo(() => {
    const pendientes = deudasFiltradas.filter(d => !d.pagado);
    return {
      totalCobrar: pendientes.filter(d => d.esAcreedor).reduce((s, d) => s + d.monto, 0),
      totalPagar: pendientes.filter(d => !d.esAcreedor).reduce((s, d) => s + d.monto, 0),
    };
  }, [deudasFiltradas]);

  const sym = getCurrencySymbol(filtroMoneda || 'ARS');

  const monedas = [...new Set(deudas.map(d => d.moneda))];

  // ── Handlers ──
  const handleSave = async (form, sharedWith) => {
    try {
      if (editando) {
        await editarDeuda(editando.id, form);
        addToast('Deuda actualizada', 'success');
      } else {
        await agregarDeuda(form, sharedWith?.userId ? sharedWith : null);
        addToast('Deuda agregada', 'success');
      }
      setEditando(null);
    } catch {
      addToast('Error al guardar la deuda', 'error');
      throw new Error('save failed');
    }
  };

  const handleMarcarPagada = async (deuda) => {
    try {
      await marcarPagada(deuda.id, deuda);
      addToast('Deuda marcada como pagada', 'success');
    } catch {
      addToast('Error al marcar como pagada', 'error');
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Eliminar esta deuda?')) return;
    try {
      await eliminarDeuda(id);
      addToast('Deuda eliminada', 'success');
    } catch {
      addToast('Error al eliminar', 'error');
    }
  };

  const handleEdit = (deuda) => {
    setEditando(deuda);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditando(null);
  };

  if (loading) return <PageSkeleton />;

  return (
    <div>
      <Header />
      <main style={{ paddingTop: 'calc(var(--navbar-height) + var(--space-6))' }}>
        <div className="deudores-container">

          {/* ── Toolbar ── */}
          <div className="deudores-toolbar">
            <div className="deudores-toolbar-left">
              <div className="deudores-search-wrapper">
                <IoSearchOutline size={15} className="deudores-search-icon" />
                <input
                  className="deudores-search-input"
                  placeholder="Buscar por nombre..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                />
              </div>

              <select className="deudores-filter-select" value={filtroRol} onChange={e => setFiltroRol(e.target.value)}>
                <option value="todos">Todos</option>
                <option value="cobrar">Me deben</option>
                <option value="pagar">Le debo a</option>
              </select>

              {monedas.length > 1 && (
                <select className="deudores-filter-select" value={filtroMoneda} onChange={e => setFiltroMoneda(e.target.value)}>
                  <option value="">Todas las monedas</option>
                  {monedas.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              )}

              <select className="deudores-filter-select" value={mostrarPagadas ? 'pagadas' : 'activas'} onChange={e => setMostrarPagadas(e.target.value === 'pagadas')}>
                <option value="activas">Activas</option>
                <option value="pagadas">Pagadas</option>
              </select>
            </div>

            <button className="deudores-btn-primary" onClick={() => setModalOpen(true)}>
              <IoAddOutline size={16} /> Nueva deuda
            </button>
          </div>

          {/* ── Resumen ── */}
          {!mostrarPagadas && (
            <div className="deudores-resumen">
              {totalCobrar > 0 && (
                <div className="deudores-resumen-chip cobrar">
                  💚 A cobrar: {sym} {totalCobrar.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </div>
              )}
              {totalPagar > 0 && (
                <div className="deudores-resumen-chip pagar">
                  🔴 A pagar: {sym} {totalPagar.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </div>
              )}
            </div>
          )}

          {/* ── Grupos ── */}
          {grupos.length === 0 ? (
            <div className="deudores-empty">
              <div className="deudores-empty-icon">🤝</div>
              <div className="deudores-empty-title">
                {mostrarPagadas ? 'No hay deudas pagadas' : 'No hay deudas activas'}
              </div>
              <p className="deudores-empty-sub">
                {!mostrarPagadas && 'Registrá quién te debe o a quién le debés'}
              </p>
              {!mostrarPagadas && (
                <button className="deudores-btn-primary" style={{ margin: '0 auto' }} onClick={() => setModalOpen(true)}>
                  <IoAddOutline size={16} /> Agregar primera deuda
                </button>
              )}
            </div>
          ) : (
            grupos.map(grupo => {
              const pendientes = grupo.deudas.filter(d => !d.pagado);
              const subtotal = pendientes.reduce((s, d) => s + d.monto, 0);
              const esAcreedor = grupo.deudas[0]?.esAcreedor;
              const monedaGrupo = grupo.deudas[0]?.moneda || 'ARS';
              const symGrupo = getCurrencySymbol(monedaGrupo);

              return (
                <div key={grupo.nombre} className="deuda-grupo">
                  {/* Header del grupo */}
                  <div className="deuda-grupo-header">
                    <div className="deuda-grupo-info">
                      <div className="deuda-grupo-avatar">
                        {grupo.nombre[0]?.toUpperCase() || '?'}
                      </div>
                      <span className="deuda-grupo-nombre">{grupo.nombre}</span>
                    </div>
                    {!mostrarPagadas && subtotal > 0 && (
                      <span className={`deuda-grupo-subtotal ${esAcreedor ? 'acreedor' : 'deudor'}`}>
                        {esAcreedor ? '+' : '-'} {symGrupo} {subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>

                  {/* Filas */}
                  {grupo.deudas.map(deuda => {
                    const cuotasInfo = deuda.tipo === 'credito' && deuda.cuotas > 1
                      ? ` · ${deuda.fechaDeuda ? calcularCuotasRestantes(deuda.fechaDeuda, deuda.cuotas) : deuda.cuotas}/${deuda.cuotas} cuotas`
                      : deuda.cuotas > 1 ? ` · ${deuda.cuotas} cuotas` : '';
                    const symD = getCurrencySymbol(deuda.moneda);

                    return (
                      <div key={deuda.id} className={`deuda-fila${deuda.pagado ? ' pagada' : ''}`}>
                        <div className="deuda-fila-left">
                          <span className="deuda-fila-descripcion">
                            {deuda.descripcion || deuda.nombre}
                          </span>
                          <span className="deuda-fila-meta">
                            {deuda.fechaDeuda}{cuotasInfo}
                            {deuda.medio && ` · ${deuda.medio}`}
                            {deuda.compartidoConNombre && ` · 🔗 ${deuda.compartidoConNombre}`}
                          </span>
                        </div>
                        <div className="deuda-fila-right">
                          <span className="deuda-fila-monto">
                            {symD} {Number(deuda.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </span>
                          {deuda.pagado ? (
                            <span className="deuda-badge-pagado">✓ Pagado</span>
                          ) : (
                            <div className="deuda-fila-acciones">
                              <button className="deuda-btn-icon success" title="Marcar como pagada" onClick={() => handleMarcarPagada(deuda)}>
                                <IoCheckmarkCircleOutline size={17} />
                              </button>
                              <button className="deuda-btn-icon" title="Editar" onClick={() => handleEdit(deuda)}>
                                <IoPencilOutline size={16} />
                              </button>
                              <button className="deuda-btn-icon danger" title="Eliminar" onClick={() => handleEliminar(deuda.id)}>
                                <IoTrashOutline size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </main>
      <Footer />

      {modalOpen && (
        <DeudaModal
          deuda={editando}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
