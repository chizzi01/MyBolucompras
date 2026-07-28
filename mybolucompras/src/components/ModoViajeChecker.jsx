// src/components/ModoViajeChecker.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { configuracionService } from '../services/configuracionService';
import { viajesService } from '../services/viajesService';
import ModoViajeModal from './ModoViajeModal';

function toISODate(date) {
  return date.toISOString().split('T')[0];
}

export default function ModoViajeChecker() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [candidato, setCandidato] = useState(null);
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!user) { redirectedRef.current = false; return; }

    let cancelled = false;

    (async () => {
      const [mydata, viajes] = await Promise.all([
        configuracionService.get(),
        viajesService.getAll(),
      ]);
      if (cancelled || !mydata) return;

      const viajesActivos = viajes.filter(v => v.estado === 'activo');
      const today = toISODate(new Date());

      if (mydata.modoViajeActivo) {
        const viaje = viajesActivos.find(v => v.id === mydata.modoViajeViajeId);
        let vencido = false;
        if (viaje?.fechaHasta) {
          const limite = new Date(`${viaje.fechaHasta}T00:00:00`);
          limite.setDate(limite.getDate() + 1);
          vencido = new Date(`${today}T00:00:00`) > limite;
        }

        if (!viaje || vencido) {
          await configuracionService.actualizar({ ...mydata, modoViajeActivo: false, modoViajeViajeId: null });
          return;
        }

        if (!redirectedRef.current) {
          redirectedRef.current = true;
          navigate(`/viajes/${viaje.id}`);
        }
        return;
      }

      const candidatos = viajesActivos
        .filter(v => v.fechaDesde && v.fechaHasta)
        .filter(v => v.fechaDesde <= today && today <= v.fechaHasta)
        .filter(v => !(mydata.modoViajePromptedIds || []).includes(v.id));

      if (candidatos.length > 0) {
        const elegido = candidatos.reduce(
          (max, v) => (v.fechaDesde > max.fechaDesde ? v : max),
          candidatos[0]
        );
        if (!cancelled) setCandidato(elegido);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

  const handleConfirmar = async (activar) => {
    const viaje = candidato;
    setCandidato(null);
    const mydata = await configuracionService.get();
    if (!mydata) return;
    const promptedIds = [...new Set([...(mydata.modoViajePromptedIds || []), viaje.id])];
    await configuracionService.actualizar({
      ...mydata,
      modoViajePromptedIds: promptedIds,
      ...(activar ? { modoViajeActivo: true, modoViajeViajeId: viaje.id } : {}),
    });
    if (activar) {
      redirectedRef.current = true;
      navigate(`/viajes/${viaje.id}`);
    }
  };

  return <ModoViajeModal viaje={candidato} onConfirm={handleConfirmar} />;
}
