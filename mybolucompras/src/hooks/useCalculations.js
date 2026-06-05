import { useMemo } from 'react';
import { getCuotasRestantes, gastoEntraEsteMes, getSingleCuotaBillingIndex } from '../utils/cuotas';
import { parsePrecio, parseFecha } from '../utils/formatters';

export function useCalculations(gastos, mydata, filteredData) {
  const totalGastado = useMemo(() => {
    const totalesPorMoneda = {};
    const hoy = new Date();
    const hoyIndex = hoy.getFullYear() * 12 + hoy.getMonth();

    (filteredData || []).forEach((g) => {
      const moneda = g.moneda?.trim() || 'ARS';
      const precioNumerico = parsePrecio(g.precio);
      if (!precioNumerico) return;

      let sumar = false;
      let precioMensual = precioNumerico;

      if (g.isFijo) {
        sumar = true;
      } else if (g.tipo === 'credito') {
        const cuotas = parseInt(g.cuotas, 10) || 1;
        if (cuotas > 1) {
          // Multi-installment: active in its purchase month range
          const [, m, y] = (g.fecha || '').split('/');
          const compraIndex = Number(y) * 12 + (Number(m) - 1);
          if (hoyIndex >= compraIndex && hoyIndex < compraIndex + cuotas) {
            const remaining = getCuotasRestantes(g, mydata);
            if (remaining === 'N/A' || remaining > 0) {
              sumar = true;
              precioMensual = precioNumerico / cuotas;
            }
          }
        } else {
          // Single-charge credit: show in billing month only
          const billingIndex = getSingleCuotaBillingIndex(g, mydata);
          if (billingIndex === hoyIndex && gastoEntraEsteMes(g, mydata)) {
            sumar = true;
          }
        }
      } else {
        // Débito / Efectivo / Transferencia: only in purchase month
        const fechaCompra = parseFecha(g.fecha);
        if (fechaCompra && !isNaN(fechaCompra)) {
          const compraIndex = fechaCompra.getFullYear() * 12 + fechaCompra.getMonth();
          if (compraIndex === hoyIndex) sumar = true;
        }
      }

      if (sumar) {
        totalesPorMoneda[moneda] = (totalesPorMoneda[moneda] || 0) + precioMensual;
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
