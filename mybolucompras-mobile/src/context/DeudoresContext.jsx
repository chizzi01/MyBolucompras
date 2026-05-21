import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { deudoresService } from '../services/deudoresService';
import { useAuth } from './AuthContext';

const DeudoresContext = createContext(null);

export function DeudoresProvider({ children }) {
  const { user } = useAuth();
  const [deudas, setDeudas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargarDeudas = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await deudoresService.getAll();
      setDeudas(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      cargarDeudas();
    } else {
      setDeudas([]);
      setLoading(false);
    }
  }, [user?.id]);

  const agregarDeuda = async (deuda) => {
    const nueva = await deudoresService.crear(deuda);
    setDeudas(prev => [nueva, ...prev]);
    return nueva;
  };

  const editarDeuda = async (id, deuda) => {
    const actualizada = await deudoresService.actualizar(id, deuda);
    setDeudas(prev => prev.map(d => d.id === id ? actualizada : d));
  };

  const marcarPagada = async (id) => {
    const actualizada = await deudoresService.marcarPagada(id);
    setDeudas(prev => prev.map(d => d.id === id ? actualizada : d));
  };

  const eliminarDeuda = async (id) => {
    await deudoresService.eliminar(id);
    setDeudas(prev => prev.filter(d => d.id !== id));
  };

  return (
    <DeudoresContext.Provider value={{
      deudas, loading, error, cargarDeudas,
      agregarDeuda, editarDeuda, marcarPagada, eliminarDeuda,
    }}>
      {children}
    </DeudoresContext.Provider>
  );
}

export function useDeudores() {
  const ctx = useContext(DeudoresContext);
  if (!ctx) throw new Error('useDeudores debe usarse dentro de DeudoresProvider');
  return ctx;
}
