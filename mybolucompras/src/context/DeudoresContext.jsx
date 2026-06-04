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
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      setError(null);
      const data = await deudoresService.getAll();
      setDeudas(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    cargarDeudas();
  }, [cargarDeudas]);

  const agregarDeuda = async (deuda, sharedWith = null) => {
    try {
      const nueva = await deudoresService.crear(deuda, sharedWith);
      setDeudas(prev => [nueva, ...prev]);
      return nueva;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const editarDeuda = async (id, deuda) => {
    const snapshot = deudas;
    setDeudas(prev => prev.map(d => d.id === id ? { ...d, ...deuda } : d));
    try {
      const actualizada = await deudoresService.actualizar(id, deuda);
      setDeudas(prev => prev.map(d => d.id === id ? actualizada : d));
    } catch (err) {
      setDeudas(snapshot);
      setError(err.message);
      throw err;
    }
  };

  const marcarPagada = async (id, deudaActual) => {
    const snapshot = deudas;
    const fechaPago = new Date().toISOString().split('T')[0].split('-').reverse().join('/');
    setDeudas(prev => prev.map(d =>
      d.id === id ? { ...d, pagado: true, fechaPago } : d
    ));
    try {
      await deudoresService.marcarPagada(id, deudaActual);
    } catch (err) {
      setDeudas(snapshot);
      setError(err.message);
      throw err;
    }
  };

  const eliminarDeuda = async (id) => {
    const snapshot = deudas;
    setDeudas(prev => prev.filter(d => d.id !== id));
    try {
      await deudoresService.eliminar(id);
    } catch (err) {
      setDeudas(snapshot);
      setError(err.message);
      throw err;
    }
  };

  return (
    <DeudoresContext.Provider value={{
      deudas, loading, error,
      agregarDeuda, editarDeuda, marcarPagada, eliminarDeuda,
      recargar: cargarDeudas,
    }}>
      {children}
    </DeudoresContext.Provider>
  );
}

export function useDeudores() {
  const ctx = useContext(DeudoresContext);
  if (!ctx) throw new Error('useDeudores must be used within DeudoresProvider');
  return ctx;
}
