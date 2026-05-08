import { useMemo } from 'react';
import { calcularCuotasRestantesCredito } from '../utils/cuotas';
import { parsePrecio, parseFecha } from '../utils/formatters';

export function useCalculations(gastos, mydata, filteredData) {
  const totalGastado = useMemo(() => {
    const totalesPorMoneda = {};
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    (filteredData || []).forEach((item) => {
      const moneda = item.moneda?.trim() || 'ARS';
      const precioNumerico = parsePrecio(item.precio);
      if (!precioNumerico) return;

      let sumar = false;
      let precioMensual = precioNumerico;

      if (item.isFijo) {
        sumar = true;
      } else if (item.tipo === 'credito' && item.cuotas > 0) {
        const fechaCompra = parseFecha(item.fecha);
        const cierreAnterior = new Date(mydata?.cierreAnterior);
        if (fechaCompra <= cierreAnterior) {
          const cuotas = parseInt(item.cuotas, 10) || 1;
          const precioPorCuota = precioNumerico / cuotas;
          const cierreDay = cierreAnterior.getDate();
          const firstStatementMonth = new Date(
            fechaCompra.getFullYear(),
            fechaCompra.getMonth() + (fechaCompra.getDate() > cierreDay ? 1 : 0), 1
          );
          for (let i = 0; i < cuotas; i++) {
            const mesCuota = new Date(firstStatementMonth.getFullYear(), firstStatementMonth.getMonth() + i, 1);
            if (mesCuota.getMonth() === mesActual && mesCuota.getFullYear() === anioActual) {
              const cuotasRestantes = calcularCuotasRestantesCredito(
                item.fecha, item.cuotas, mydata?.vencimiento, mydata?.cierre,
                mydata?.vencimientoAnterior, mydata?.cierreAnterior
              );
              if (cuotasRestantes > 0) { sumar = true; precioMensual = precioPorCuota; break; }
            }
          }
        }
      } else if (item.tipo === 'debito' || item.medio === 'Efectivo' || item.medio === 'Transferencia') {
        const fechaCompra = parseFecha(item.fecha);
        if (fechaCompra.getMonth() === mesActual && fechaCompra.getFullYear() === anioActual) sumar = true;
      }

      if (sumar) {
        if (!totalesPorMoneda[moneda]) totalesPorMoneda[moneda] = 0;
        totalesPorMoneda[moneda] += precioMensual;
      }
    });

    Object.keys(totalesPorMoneda).forEach(m => {
      totalesPorMoneda[m] = totalesPorMoneda[m].toFixed(2);
    });
    return totalesPorMoneda;
  }, [filteredData, mydata]);

  const bancoMasUsado = useMemo(() => {
    if (!Array.isArray(gastos) || gastos.length === 0) return 'N/A';
    const counts = {};
    gastos.forEach(item => { const b = item?.banco || 'Sin banco'; counts[b] = (counts[b] || 0) + 1; });
    const max = Math.max(...Object.values(counts));
    return Object.keys(counts).find(k => counts[k] === max) || 'N/A';
  }, [gastos]);

  const tarjetaMasUsada = useMemo(() => {
    if (!Array.isArray(gastos) || gastos.length === 0) return 'N/A';
    const counts = {};
    gastos.forEach(item => { const m = item?.medio || 'Sin medio'; counts[m] = (counts[m] || 0) + 1; });
    const max = Math.max(...Object.values(counts));
    return Object.keys(counts).find(k => counts[k] === max) || 'N/A';
  }, [gastos]);

  return { totalGastado, bancoMasUsado, tarjetaMasUsada };
}
