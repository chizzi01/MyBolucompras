// src/context/ViajesContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { viajesService } from '../services/viajesService';
import { useAuth } from './AuthContext';

const ViajesContext = createContext(null);

export function ViajesProvider({ children }) {
  const { user } = useAuth();
  const [viajes, setViajes] = useState([]);
  const [loading, setLoading] = useState(false);

  const cargarViajes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await viajesService.getAll();
      setViajes(data);
    } catch (err) {
      console.warn('[ViajesContext] cargarViajes:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) cargarViajes();
    else setViajes([]);
  }, [user?.id]);

  const crearViaje = async (titulo, emoji, participanteIds) => {
    const nuevo = await viajesService.crear(titulo, emoji, participanteIds);
    setViajes(prev => [nuevo, ...prev]);
    return nuevo;
  };

  const cerrarViaje = async (id) => {
    await viajesService.cerrar(id);
    setViajes(prev => prev.map(v => v.id === id ? { ...v, estado: 'cerrado' } : v));
  };

  const eliminarViaje = async (id) => {
    await viajesService.eliminar(id);
    setViajes(prev => prev.filter(v => v.id !== id));
  };

  const editarViaje = async (id, campos) => {
    await viajesService.editarViaje(id, campos);
    setViajes(prev => prev.map(v => v.id === id ? { ...v, ...campos } : v));
  };

  const viajesActivos = viajes.filter(v => v.estado === 'activo');

  return (
    <ViajesContext.Provider value={{
      viajes, viajesActivos, loading,
      cargarViajes, crearViaje, cerrarViaje, eliminarViaje, editarViaje,
    }}>
      {children}
    </ViajesContext.Provider>
  );
}

export function useViajes() {
  const ctx = useContext(ViajesContext);
  if (!ctx) throw new Error('useViajes debe usarse dentro de ViajesProvider');
  return ctx;
}
