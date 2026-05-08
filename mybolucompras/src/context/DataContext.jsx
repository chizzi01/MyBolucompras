import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { gastosService } from '../services/gastosService';
import { configuracionService } from '../services/configuracionService';
import { etiquetasService } from '../services/etiquetasService';
import { presupuestosService } from '../services/presupuestosService';
import { useAuth } from './AuthContext';
import { isDemoMode, DEMO_GASTOS, DEMO_MYDATA } from '../lib/demoMode';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user } = useAuth();
  const demo = isDemoMode();

  const [gastos, setGastos] = useState(demo ? DEMO_GASTOS : []);
  const [mydata, setMydata] = useState(demo ? DEMO_MYDATA : {
    cierre: '', vencimiento: '', cierreAnterior: '', vencimientoAnterior: '',
    fondos: 0, etiquetas: [], presupuestos: {},
  });
  const [loading, setLoading] = useState(!demo);
  const [error, setError] = useState(null);

  const cargarDatos = useCallback(async () => {
    if (demo || !user) return;
    setLoading(true);
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
  }, [user, demo]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // --- GASTOS ---
  const agregarGasto = async (gasto) => {
    if (demo) {
      const nuevo = { ...gasto, id: `demo-${Date.now()}`, precio: `$ ${Number(gasto.precio).toFixed(2)}`, fecha: gasto.fecha.includes('-') ? gasto.fecha.split('-').reverse().join('/') : gasto.fecha };
      setGastos(prev => [nuevo, ...prev]);
      return nuevo;
    }
    const nuevo = await gastosService.crear(gasto);
    setGastos(prev => [nuevo, ...prev]);
    return nuevo;
  };

  const editarGasto = async (id, gasto) => {
    if (demo) {
      setGastos(prev => prev.map(g => g.id === id ? { ...g, ...gasto, precio: `$ ${Number(gasto.precio).toFixed(2)}` } : g));
      return;
    }
    const actualizado = await gastosService.actualizar(id, gasto);
    setGastos(prev => prev.map(g => g.id === id ? actualizado : g));
  };

  const eliminarGasto = async (id) => {
    if (demo) { setGastos(prev => prev.filter(g => g.id !== id)); return; }
    await gastosService.eliminar(id);
    setGastos(prev => prev.filter(g => g.id !== id));
  };

  const actualizarEtiquetaGasto = async (id, etiqueta) => {
    if (demo) { setGastos(prev => prev.map(g => g.id === id ? { ...g, etiqueta } : g)); return; }
    const actualizado = await gastosService.actualizarEtiqueta(id, etiqueta);
    setGastos(prev => prev.map(g => g.id === id ? actualizado : g));
  };

  // --- CONFIGURACION ---
  const actualizarConfig = async (nuevaConfig) => {
    const merged = { ...mydata, ...nuevaConfig };
    if (!demo) await configuracionService.actualizar(merged);
    setMydata(merged);
  };

  const actualizarCierre = async (cierre, vencimiento, cierreAnterior, vencimientoAnterior) => {
    const nuevaConfig = { ...mydata, cierre, vencimiento, cierreAnterior, vencimientoAnterior };
    if (!demo) await configuracionService.actualizar(nuevaConfig);
    setMydata(nuevaConfig);
  };

  const actualizarFondos = async (fondos) => {
    const nuevaConfig = { ...mydata, fondos: Number(fondos) };
    if (!demo) await configuracionService.actualizar(nuevaConfig);
    setMydata(nuevaConfig);
  };

  // --- ETIQUETAS ---
  const agregarEtiqueta = async (nombre, color) => {
    if (demo) {
      setMydata(prev => ({ ...prev, etiquetas: [...(prev.etiquetas || []), { nombre, color }] }));
      return;
    }
    const etiquetasActualizadas = await etiquetasService.agregar(mydata, { nombre, color });
    setMydata(prev => ({ ...prev, etiquetas: etiquetasActualizadas }));
  };

  const eliminarEtiqueta = async (nombre) => {
    if (demo) {
      setGastos(prev => prev.map(g => g.etiqueta === nombre ? { ...g, etiqueta: '' } : g));
      setMydata(prev => ({
        ...prev,
        etiquetas: prev.etiquetas.filter(e => e.nombre !== nombre),
        presupuestos: Object.fromEntries(Object.entries(prev.presupuestos || {}).filter(([k]) => k !== nombre)),
      }));
      return;
    }
    const [{ etiquetas, presupuestos }] = await Promise.all([
      etiquetasService.eliminar(mydata, nombre),
      gastosService.quitarEtiquetaDeTodos(nombre),
    ]);
    setGastos(prev => prev.map(g => g.etiqueta === nombre ? { ...g, etiqueta: '' } : g));
    setMydata(prev => ({ ...prev, etiquetas, presupuestos }));
  };

  // --- PRESUPUESTOS ---
  const actualizarPresupuesto = async (etiqueta, monto, visible = true) => {
    if (demo) {
      setMydata(prev => ({ ...prev, presupuestos: { ...prev.presupuestos, [etiqueta]: { monto: Number(monto), visible } } }));
      return;
    }
    const presupuestosActualizados = await presupuestosService.actualizar(mydata, etiqueta, monto, visible);
    setMydata(prev => ({ ...prev, presupuestos: presupuestosActualizados }));
  };

  const toggleVisibilidadPresupuesto = async (etiqueta) => {
    if (demo) {
      setMydata(prev => {
        const actual = prev.presupuestos?.[etiqueta] || {};
        return { ...prev, presupuestos: { ...prev.presupuestos, [etiqueta]: { ...actual, visible: !actual.visible } } };
      });
      return;
    }
    const presupuestosActualizados = await presupuestosService.toggleVisibilidad(mydata, etiqueta);
    setMydata(prev => ({ ...prev, presupuestos: presupuestosActualizados }));
  };

  return (
    <DataContext.Provider value={{
      gastos, mydata, loading, error, demo, cargarDatos,
      agregarGasto, editarGasto, eliminarGasto, actualizarEtiquetaGasto,
      actualizarConfig, actualizarCierre, actualizarFondos,
      agregarEtiqueta, eliminarEtiqueta,
      actualizarPresupuesto, toggleVisibilidadPresupuesto,
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
