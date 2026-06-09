import { parsePrecio, formatPrecioEuropeo, getCurrencySymbol } from './formatters';
import { gastoEntraEsteMes, getSingleCuotaBillingIndex } from './cuotas';

// Costo que un gasto aporta al mes seleccionado.
// Fijo: precio × cantidad. Crédito multi-cuota: precio / cuotas. Resto: precio.
export function getCostoMes(gasto) {
  if (gasto.isFijo) return parsePrecio(gasto.precio) * (parseInt(gasto.cantidad) || 1);
  if (gasto.tipo === 'credito' && Number(gasto.cuotas) > 1)
    return parsePrecio(gasto.precio) / Number(gasto.cuotas);
  return parsePrecio(gasto.precio);
}

// Filtra los gastos que aplican al mes dado (mesSel = { mes: 0-11, anio: YYYY }).
// Replica exactamente la lógica de gastosVariablesMes + gastosFijosMes de DashboardScreen.
export function getGastosMes(gastos, mesSel, mydata) {
  const targetIndex = mesSel.anio * 12 + mesSel.mes;
  const hoy = new Date();
  const hoyIndex = hoy.getFullYear() * 12 + hoy.getMonth();

  const gastosVariables = gastos.filter(g => {
    if (g.isFijo) return false;
    const [, m, y] = (g.fecha || '').split('/');
    const compraIndex = Number(y) * 12 + (Number(m) - 1);
    const cuotas = parseInt(g.cuotas) || 1;

    if (g.tipo === 'credito') {
      if (cuotas > 1) {
        if (targetIndex < compraIndex || targetIndex >= compraIndex + cuotas) return false;
      } else {
        const billingIndex = getSingleCuotaBillingIndex(g, mydata);
        if (billingIndex !== targetIndex) return false;
      }
      if (targetIndex === hoyIndex) return gastoEntraEsteMes(g, mydata);
      return true;
    }
    return compraIndex === targetIndex;
  });

  const gastosFijos = gastos.filter(g => {
    if (!g.isFijo) return false;
    const [, m, y] = (g.fecha || '').split('/');
    const startIndex = Number(y) * 12 + (Number(m) - 1);
    if (targetIndex < startIndex) return false;
    const period = parseInt(g.cuotas) || 0;
    return period === 0 || targetIndex < startIndex + period;
  });

  return [...gastosVariables, ...gastosFijos];
}

// Suma precio por moneda usando getCostoMes.
// Retorna { ARS: 284500, USD: 25, ... }
export function calcularTotalesPorMoneda(gastos) {
  const totales = {};
  gastos.forEach(g => {
    const moneda = g.moneda || 'ARS';
    totales[moneda] = (totales[moneda] || 0) + getCostoMes(g);
  });
  return totales;
}

// Formato compacto para KPI chips: "$284k", "US$1,2M", etc.
export function formatAmountShort(amount, moneda = 'ARS') {
  const sym = getCurrencySymbol(moneda);
  if (amount >= 1_000_000) return `${sym}${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${sym}${Math.round(amount / 1_000)}k`;
  return formatPrecioEuropeo(amount, moneda);
}
