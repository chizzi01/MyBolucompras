// src/components/CierreChecker.jsx
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import ActualizarCierreModal from './ActualizarCierreModal';

export default function CierreChecker() {
  const { mydata } = useData();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!mydata?.cierre) return;
    const cierre = new Date(mydata.cierre);
    if (!isNaN(cierre) && new Date() > cierre) {
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
