import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { gastosService } from '../services/gastosService';
import { configuracionService } from '../services/configuracionService';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

const defaultMydata = {
  cierre: '', vencimiento: '',
  cierreAnterior: '', vencimientoAnterior: '',
  fondos: 0, etiquetas: [], presupuestos: {},
  bancosHabilitados: [], mediosHabilitados: [], monedaPreferida: 'ARS',
};

export function DataProvider({ children }) {
  const { user } = useAuth();
  const [gastos, setGastos] = useState([]);
  const [mydata, setMydata] = useState(defaultMydata);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargarDatos = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [gastosData, configData] = await Promise.all([
        gastosService.getAll(),
        configuracionService.get(),
      ]);
      setGastos(gastosData);
      if (configData) setMydata(configData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      cargarDatos();
    } else {
      setGastos([]);
      setMydata(defaultMydata);
      setLoading(false);
    }
  }, [user?.id]);

  const agregarGasto = async (gasto, sharedWith = null) => {
    const nuevo = await gastosService.crear(gasto, sharedWith);
    setGastos(prev => [nuevo, ...prev]);
    return nuevo;
  };

  const editarGasto = async (id, gasto, sharedWith = null) => {
    const actualizado = await gastosService.actualizar(id, gasto, sharedWith);
    setGastos(prev => prev.map(g => g.id === id ? actualizado : g));
  };

  const eliminarGasto = async (id) => {
    await gastosService.eliminar(id);
    setGastos(prev => prev.filter(g => g.id !== id));
  };

  const actualizarConfig = async (nuevaConfig) => {
    const merged = { ...mydata, ...nuevaConfig };
    await configuracionService.actualizar(merged);
    setMydata(merged);
  };

  const actualizarFondos = async (fondos) => {
    const nuevaConfig = { ...mydata, fondos: Number(fondos) };
    await configuracionService.actualizar(nuevaConfig);
    setMydata(nuevaConfig);
  };

  const actualizarCierre = async (cierre, vencimiento, cierreAnterior, vencimientoAnterior) => {
    const nuevaConfig = { ...mydata, cierre, vencimiento, cierreAnterior, vencimientoAnterior };
    await configuracionService.actualizar(nuevaConfig);
    setMydata(nuevaConfig);
  };

  return (
    <DataContext.Provider value={{
      gastos, mydata, loading, error, cargarDatos,
      agregarGasto, editarGasto, eliminarGasto,
      actualizarConfig, actualizarFondos, actualizarCierre,
      setMydata,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData debe usarse dentro de DataProvider');
  return ctx;
}
