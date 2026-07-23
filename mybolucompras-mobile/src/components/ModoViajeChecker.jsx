import React, { useState, useEffect, useRef } from 'react';
import { useConfiguracion } from '../hooks/queries/useConfiguracion';
import { useConfiguracionMutations } from '../hooks/mutations/useConfiguracionMutations';
import { useViajes } from '../hooks/queries/useViajes';
import { navigate, navigationRef } from '../navigation/navigationRef';
import { toISODate, parseISODate } from '../utils/formatters';
import ModoViajeModal from './ModoViajeModal';

export default function ModoViajeChecker() {
  const { mydata } = useConfiguracion();
  const { actualizar } = useConfiguracionMutations();
  const { viajesActivos, loading } = useViajes();
  const [candidato, setCandidato] = useState(null);
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!mydata) return;
    if (loading) return;

    const today = toISODate(new Date());
    const todayDate = parseISODate(today);

    if (mydata.modoViajeActivo) {
      const viaje = viajesActivos.find(v => v.id === mydata.modoViajeViajeId);
      let vencido = false;
      if (viaje?.fechaHasta) {
        const limite = parseISODate(viaje.fechaHasta);
        limite.setDate(limite.getDate() + 1);
        vencido = todayDate > limite;
      }

      if (!viaje || vencido) {
        actualizar.mutateAsync({ ...mydata, modoViajeActivo: false, modoViajeViajeId: null });
        return;
      }

      if (mydata.modoViajeViajeId && !redirectedRef.current) {
        const viajeId = mydata.modoViajeViajeId;
        const tryNavigate = () => {
          if (redirectedRef.current) return;
          if (navigationRef.isReady()) {
            redirectedRef.current = true;
            navigate('ViajeDetail', { viajeId });
          } else {
            setTimeout(tryNavigate, 150);
          }
        };
        tryNavigate();
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
      setCandidato(elegido);
    }
  }, [mydata, viajesActivos, loading]);

  return (
    <ModoViajeModal
      visible={!!candidato}
      viaje={candidato}
      onClose={() => setCandidato(null)}
    />
  );
}
