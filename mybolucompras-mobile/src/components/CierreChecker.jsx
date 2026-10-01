import React, { useState, useEffect } from 'react';
import { useConfiguracion } from '../hooks/queries/useConfiguracion';
import ActualizarCierreModal from './ActualizarCierreModal';
import { parseISODate } from '../utils/formatters';

export default function CierreChecker() {
  const { mydata } = useConfiguracion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!mydata?.cierre) return;
    // El día del cierre todavía pertenece a ese resumen: pasó recién al día siguiente.
    const cierre = parseISODate(mydata.cierre);
    const now = new Date();
    const hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (cierre && !isNaN(cierre) && hoy > cierre) {
      setVisible(true);
    }
  }, [mydata?.cierre]);

  return (
    <ActualizarCierreModal
      visible={visible}
      onClose={() => setVisible(false)}
    />
  );
}
