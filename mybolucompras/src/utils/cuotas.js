import { parseFecha } from './formatters';

export function sumarDiasHabiles(fechaInicial, diasHabiles) {
  let fecha = new Date(fechaInicial);
  let diasContados = 0;

  while (diasContados < diasHabiles) {
    fecha.setDate(fecha.getDate() + 1);
    const diaSemana = fecha.getDay();
    // 0 = domingo, 6 = sábado
    if (diaSemana !== 0 && diaSemana !== 6) {
      diasContados++;
    }
  }

  return fecha;
}

export const calcularCuotasRestantesCredito = (
  fecha, cuotas, fechaVencimiento, fechaCierre, fechaVencimientoAnterior, fechaCierreAnterior
) => {
  const fechaCompra = parseFecha(fecha);
  if (isNaN(fechaCompra)) return 'N/A';

  const fechaVenc = fechaVencimiento ? new Date(fechaVencimiento) : null;
  const fechaVencAnt = fechaVencimientoAnterior ? new Date(fechaVencimientoAnterior) : null;
  const fechaCierreDate = fechaCierre ? new Date(fechaCierre) : null;
  const fechaCierreAnteriorDate = fechaCierreAnterior ? new Date(fechaCierreAnterior) : null;

  const vencOk = fechaVenc && !isNaN(fechaVenc);
  const vencAntOk = fechaVencAnt && !isNaN(fechaVencAnt);
  const cierreOk = fechaCierreDate && !isNaN(fechaCierreDate);
  const cierreAntOk = fechaCierreAnteriorDate && !isNaN(fechaCierreAnteriorDate);

  // Fast path: purchase is within the current billing window — no installment charged yet.
  if (cierreAntOk && cierreOk && fechaCompra > fechaCierreAnteriorDate && fechaCompra <= fechaCierreDate) {
    return parseInt(cuotas, 10);
  }

  // For purchases before cierreAnterior (previous billing cycle), use vencimientoAnterior
  // as the reference — that's when the first installment fires for those purchases.
  const refVenc = (cierreAntOk && vencAntOk && fechaCompra <= fechaCierreAnteriorDate)
    ? fechaVencAnt
    : fechaVenc;
  const refVencOk = refVenc && !isNaN(refVenc);

  if (!refVencOk || !cierreOk) {
    const hoy = new Date();
    const diferenciaMeses =
      (hoy.getFullYear() - fechaCompra.getFullYear()) * 12 +
      (hoy.getMonth() - fechaCompra.getMonth());
    const restantes = parseInt(cuotas, 10) - diferenciaMeses;
    return restantes < 0 ? 0 : restantes;
  }

  const diferenciaMeses =
    (refVenc.getFullYear() - fechaCompra.getFullYear()) * 12 +
    (refVenc.getMonth() - fechaCompra.getMonth());
  const cuotasRestantes = parseInt(cuotas, 10) - diferenciaMeses;
  return cuotasRestantes < 0 ? 0 : cuotasRestantes + 1;
};

export const calcularCuotasRestantes = (fecha, cuotas) => {
  const fechaActual = new Date();
  const fechaCompra = parseFecha(fecha);
  const diferenciaMeses =
    (fechaActual.getFullYear() - fechaCompra.getFullYear()) * 12 +
    (fechaActual.getMonth() - fechaCompra.getMonth());
  const cuotasRestantes = parseInt(cuotas, 10) - diferenciaMeses;
  return cuotasRestantes < 0 ? 0 : cuotasRestantes;
};

export function getCuotasRestantes(gasto, mydata) {
  if (gasto.isFijo) return '∞';
  if (gasto.tipo === 'credito') {
    return calcularCuotasRestantesCredito(
      gasto.fecha,
      gasto.cuotas,
      mydata?.vencimiento,
      mydata?.cierre,
      mydata?.vencimientoAnterior,
      mydata?.cierreAnterior,
    );
  }
  return calcularCuotasRestantes(gasto.fecha, gasto.cuotas);
}

// Returns the month index (year*12+month) where a single-cuota credit expense
// belongs in the dashboard — the billing month, not the purchase month.
// Falls back to purchase month for old/paid expenses or when dates aren't set.
export function getSingleCuotaBillingIndex(gasto, mydata) {
  const [, m, y] = (gasto.fecha || '').split('/');
  const compraIndex = Number(y) * 12 + (Number(m) - 1);

  const remaining = calcularCuotasRestantesCredito(
    gasto.fecha, gasto.cuotas,
    mydata?.vencimiento, mydata?.cierre,
    mydata?.vencimientoAnterior, mydata?.cierreAnterior,
  );
  if (!remaining || remaining <= 0) return compraIndex;

  const fechaCompra = parseFecha(gasto.fecha);
  if (!fechaCompra || isNaN(fechaCompra)) return compraIndex;

  const cierreAnt = mydata?.cierreAnterior ? new Date(mydata.cierreAnterior) : null;
  const cierre = mydata?.cierre ? new Date(mydata.cierre) : null;
  const vencAnt = mydata?.vencimientoAnterior ? new Date(mydata.vencimientoAnterior) : null;
  const venc = mydata?.vencimiento ? new Date(mydata.vencimiento) : null;

  const cierreAntOk = cierreAnt && !isNaN(cierreAnt);
  const cierreOk = cierre && !isNaN(cierre);
  const vencAntOk = vencAnt && !isNaN(vencAnt);
  const vencOk = venc && !isNaN(venc);

  // Current billing window: first charge is at vencimiento (next month)
  if (cierreAntOk && cierreOk && vencOk && fechaCompra > cierreAnt && fechaCompra <= cierre) {
    return venc.getFullYear() * 12 + venc.getMonth();
  }

  // Previous billing window: first charge is at vencimientoAnterior (this month)
  if (cierreAntOk && vencAntOk && fechaCompra <= cierreAnt) {
    return vencAnt.getFullYear() * 12 + vencAnt.getMonth();
  }

  return compraIndex;
}

// Returns false when a credit expense was purchased after the last closing date
// and hasn't been charged yet (first charge will appear next month)
export function gastoEntraEsteMes(gasto, mydata) {
  if (gasto.isFijo) return true;
  if (gasto.tipo !== 'credito') return true;
  const fechaCompra = parseFecha(gasto.fecha);
  if (!fechaCompra || isNaN(fechaCompra)) return true;
  const fechaCierreDate = mydata?.cierre ? new Date(mydata.cierre) : null;
  const fechaCierreAnteriorDate = mydata?.cierreAnterior ? new Date(mydata.cierreAnterior) : null;
  const cierreOk = fechaCierreDate && !isNaN(fechaCierreDate);
  const cierreAntOk = fechaCierreAnteriorDate && !isNaN(fechaCierreAnteriorDate);
  if (!cierreOk || !cierreAntOk) return true;

  // If cierre already passed, we can't determine the new pending window without
  // a future cierre. Show everything normally until the user sets a new cierre
  // (CierreChecker will prompt them).
  if (new Date() > fechaCierreDate) return true;
  return !(fechaCompra > fechaCierreAnteriorDate && fechaCompra <= fechaCierreDate);
}
