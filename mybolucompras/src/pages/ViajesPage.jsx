// src/pages/ViajesPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Navbar';
import Footer from '../components/Footer';
import PageSkeleton from '../components/PageSkeleton';
import { useToast } from '../components/Toast';
import { useViajes } from '../context/ViajesContext';
import { useAuth } from '../context/AuthContext';
import CrearViajeModal from '../components/viajes/CrearViajeModal';
import { IoAddOutline } from 'react-icons/io5';
import '../styles/modal.css';
import '../styles/viajes.css';

function ViajeCard({ v, onClick }) {
  const activo = v.estado === 'activo';
  const nombres = v.participantes.map(p => p.nombre.split(' ')[0]).join(', ');

  return (
    <div
      className={`viaje-card-mobile${activo ? '' : ' cerrado'}`}
      onClick={onClick}
    >
      {/* Left accent border */}
      <div className={`viaje-card-accent${activo ? ' activo' : ''}`} />

      {/* Main content */}
      <div className="viaje-card-content">
        {/* Top row: emoji + title + badge */}
        <div className="viaje-card-top">
          {v.imagenUrl ? (
            <div
              className="viaje-card-img-thumb-sm"
              style={{ backgroundImage: `url(${v.imagenUrl}?w=120&q=60)` }}
            />
          ) : (
            <span className="viaje-card-emoji-sm">{v.emoji}</span>
          )}
          <div className="viaje-card-titulo-block">
            <div className="viaje-card-titulo-mobile">{v.titulo}</div>
            <div className={`viaje-card-badge${activo ? ' activo' : ' cerrado'}`}>
              {activo ? '● Activo' : '🔒 Cerrado'}
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="viaje-card-participantes">{nombres}</div>

        {/* Chips */}
        {(v._gastoCount > 0 || v._checklistTotal > 0) && (
          <div className="viaje-card-chips">
            {v._gastoCount > 0 && (
              <span className="viaje-chip">💸 {v._gastoCount} gasto{v._gastoCount !== 1 ? 's' : ''}</span>
            )}
            {v._checklistTotal > 0 && (
              <span className="viaje-chip">✅ {v._checklistDone}/{v._checklistTotal}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ViajesPage() {
  const navigate = useNavigate();
  const addToast = useToast();
  const { viajes, loading, crear } = useViajes();
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  const activos = viajes.filter(v => v.estado === 'activo');
  const archivados = viajes.filter(v => v.estado === 'cerrado');

  const handleCrear = async (titulo, emoji, participanteIds) => {
    try {
      const nuevo = await crear(titulo, emoji, participanteIds);
      setModalOpen(false);
      addToast('Viaje creado', 'success');
      navigate(`/viajes/${nuevo.id}`);
    } catch {
      addToast('Error al crear el viaje', 'error');
      throw new Error('create failed');
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main style={{ paddingTop: 'calc(var(--navbar-height) + var(--space-6))', flex: 1 }}>
        <div className="viajes-container">
          <div className="viajes-toolbar">
            <div>
              <div className="viajes-toolbar-title">Mis Viajes ✈️</div>
              <div className="viajes-toolbar-sub">
                {activos.length} activo{activos.length !== 1 ? 's' : ''} · {archivados.length} archivado{archivados.length !== 1 ? 's' : ''}
              </div>
            </div>
            <button className="viajes-btn-primary" onClick={() => setModalOpen(true)}>
              <IoAddOutline size={16} /> Nuevo viaje
            </button>
          </div>

          {viajes.length === 0 ? (
            <div className="viajes-empty">
              <div className="viajes-empty-icon">✈️</div>
              <div className="viajes-empty-title">No hay viajes todavía</div>
              <p className="viajes-empty-sub">Creá tu primer viaje y empezá a dividir los gastos</p>
              <button className="viajes-btn-primary" style={{ margin: '0 auto' }} onClick={() => setModalOpen(true)}>
                <IoAddOutline size={16} /> Crear primer viaje
              </button>
            </div>
          ) : (
            <>
              {activos.length > 0 && (
                <>
                  <div className="viajes-section-title">Activos</div>
                  {activos.map(v => (
                    <ViajeCard key={v.id} v={v} onClick={() => navigate(`/viajes/${v.id}`)} />
                  ))}
                </>
              )}
              {archivados.length > 0 && (
                <>
                  <div className="viajes-section-title">Archivados</div>
                  {archivados.map(v => (
                    <ViajeCard key={v.id} v={v} onClick={() => navigate(`/viajes/${v.id}`)} />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />

      {modalOpen && (
        <CrearViajeModal
          onClose={() => setModalOpen(false)}
          onSave={handleCrear}
          currentUserId={user?.id}
          currentUserNombre={user?.user_metadata?.nombre || user?.email}
        />
      )}
    </div>
  );
}
