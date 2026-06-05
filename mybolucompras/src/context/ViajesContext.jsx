// src/context/ViajesContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { viajesService } from '../services/viajesService';

const ViajesContext = createContext(null);

export function ViajesProvider({ children }) {
  const { user } = useAuth();
  const [viajes, setViajes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cargarViajes = useCallback(async () => {
    if (!user) { setViajes([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await viajesService.getAll();
      setViajes(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { cargarViajes(); }, [cargarViajes]);

  const crear = async (titulo, emoji, participanteIds) => {
    const snapshot = [...viajes];
    try {
      const nuevo = await viajesService.crear(titulo, emoji, participanteIds);
      setViajes(prev => [nuevo, ...prev]);
      return nuevo;
    } catch (e) {
      setViajes(snapshot);
      throw e;
    }
  };

  const editarViaje = async (id, campos) => {
    const snapshot = [...viajes];
    setViajes(prev => prev.map(v => v.id === id ? { ...v, ...campos } : v));
    try {
      await viajesService.editarViaje(id, campos);
    } catch (e) {
      setViajes(snapshot);
      throw e;
    }
  };

  const cerrar = async (id) => {
    // No optimistic — can throw with validation error
    await viajesService.cerrar(id);
    setViajes(prev => prev.map(v => v.id === id
      ? { ...v, estado: 'cerrado', fechaCierre: new Date().toISOString() }
      : v
    ));
  };

  const reabrir = async (id) => {
    await viajesService.reabrir(id);
    setViajes(prev => prev.map(v => v.id === id
      ? { ...v, estado: 'activo', fechaCierre: null }
      : v
    ));
  };

  const eliminar = async (id) => {
    const snapshot = [...viajes];
    setViajes(prev => prev.filter(v => v.id !== id));
    try {
      await viajesService.eliminar(id);
    } catch (e) {
      setViajes(snapshot);
      throw e;
    }
  };

  return (
    <ViajesContext.Provider value={{
      viajes, loading, error,
      crear, editarViaje, cerrar, reabrir, eliminar,
      recargar: cargarViajes,
    }}>
      {children}
    </ViajesContext.Provider>
  );
}

export function useViajes() {
  const ctx = useContext(ViajesContext);
  if (!ctx) throw new Error('useViajes must be used inside ViajesProvider');
  return ctx;
}
