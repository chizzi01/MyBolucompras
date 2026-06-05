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
import { IoAddOutline, IoAirplaneOutline } from 'react-icons/io5';
import '../styles/viajes.css';

const PARTICIPANT_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const MAX_AVATARS = 4;

function getColor(idx) {
  return PARTICIPANT_COLORS[idx % PARTICIPANT_COLORS.length];
}

function AvatarStack({ participantes }) {
  const visible = participantes.slice(0, MAX_AVATARS);
  const overflow = participantes.length - MAX_AVATARS;
  return (
    <div className="viaje-avatar-stack">
      {visible.map((p, i) => (
        <div key={p.userId} className="viaje-avatar" style={{ background: getColor(i) }} title={p.nombre}>
          {p.nombre?.[0]?.toUpperCase() || '?'}
        </div>
      ))}
      {overflow > 0 && (
        <div className="viaje-avatar viaje-avatar-overflow">+{overflow}</div>
      )}
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

  const renderCard = (v) => (
    <div key={v.id} className="viaje-card" onClick={() => navigate(`/viajes/${v.id}`)}>
      <div className="viaje-card-emoji">{v.emoji}</div>
      <div className="viaje-card-body">
        <div className="viaje-card-titulo">{v.titulo}</div>
        <div className="viaje-card-meta">
          <AvatarStack participantes={v.participantes} />
          <span className="viaje-card-total">{v.participantes.length} participante{v.participantes.length !== 1 ? 's' : ''}</span>
          {v.estado === 'cerrado' && <span className="viaje-card-estado cerrado">Archivado</span>}
        </div>
      </div>
    </div>
  );

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
                  {activos.map(renderCard)}
                </>
              )}
              {archivados.length > 0 && (
                <>
                  <div className="viajes-section-title">Archivados</div>
                  {archivados.map(renderCard)}
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
