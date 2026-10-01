import { parseFecha, parseISODate } from './formatters';

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

const DAY_MS = 24 * 60 * 60 * 1000;
const isValidDate = d => d instanceof Date && !isNaN(d);
const monthIndex = d => d.getFullYear() * 12 + d.getMonth();
const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const diasEntre = (a, b) => Math.round((b - a) / DAY_MS);

// Suma n meses manteniendo el día (recortado al último día del mes: 31/01 + 1 → 28/02).
export function addMonths(date, n) {
  const y = date.getFullYear();
  const m = date.getMonth() + n;
  const ultimoDia = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(date.getDate(), ultimoDia));
}

// Valida las 4 fechas de tarjeta (strings YYYY-MM-DD; vacías se ignoran).
// Devuelve un mensaje de error o null.
export function validarFechasTarjeta({ cierre, vencimiento, cierreAnterior, vencimientoAnterior }) {
  const c1 = parseISODate(cierre);
  const v1 = parseISODate(vencimiento);
  const c0 = parseISODate(cierreAnterior);
  const v0 = parseISODate(vencimientoAnterior);
  const ok = d => isValidDate(d);

  if (ok(c1) && ok(v1)) {
    const d = diasEntre(c1, v1);
    if (d < 1 || d > 25) return 'El vencimiento actual tiene que ser entre 1 y 25 días después del cierre actual.';
  }
  if (ok(c0) && ok(v0)) {
    const d = diasEntre(c0, v0);
    if (d < 1 || d > 25) return 'El vencimiento anterior tiene que ser entre 1 y 25 días después del cierre anterior.';
  }
  if (ok(c0) && ok(c1)) {
    const d = diasEntre(c0, c1);
    if (d < 20 || d > 45) return 'El cierre anterior tiene que ser aproximadamente un mes antes del cierre actual.';
  }
  return null;
}

// Ciclo de facturación vigente a la fecha `hoy`:
//   c0/v0 = cierre y vencimiento del último resumen cerrado (el que se paga "este mes")
//   c1/v1 = cierre y vencimiento del resumen abierto (compras que entran el mes que viene)
// Si el cierre ya pasó y el usuario no lo actualizó, avanza el ciclo de a un mes.
// Si los "anteriores" faltan o son inconsistentes, los deriva restando un mes.
// Devuelve null cuando no hay cierre/vencimiento usables.
export function getCicloTarjeta(mydata, hoy = new Date()) {
  const c1Base = parseISODate(mydata?.cierre);
  const v1Base = parseISODate(mydata?.vencimiento);
  if (!isValidDate(c1Base) || !isValidDate(v1Base)) return null;
  if (validarFechasTarjeta({ cierre: mydata.cierre, vencimiento: mydata.vencimiento })) return null;

  let c0 = parseISODate(mydata?.cierreAnterior);
  let v0 = parseISODate(mydata?.vencimientoAnterior);
  if (!isValidDate(c0) || !isValidDate(v0) || validarFechasTarjeta(mydata)) {
    c0 = addMonths(c1Base, -1);
    v0 = addMonths(v1Base, -1);
  }

  const today = startOfDay(hoy);
  let k = 0;
  while (today > addMonths(c1Base, k) && k < 120) k++;
  if (k === 0) return { c0, v0, c1: c1Base, v1: v1Base };
  return {
    c0: addMonths(c1Base, k - 1),
    v0: addMonths(v1Base, k - 1),
    c1: addMonths(c1Base, k),
    v1: addMonths(v1Base, k),
  };
}

// primera_cuota guardada en la base ('YYYY-MM', calculada con la tarjeta de quien
// hizo la compra). Tiene prioridad sobre el cálculo con la tarjeta de quien mira, y
// se compara contra el mes calendario: así dos personas que comparten el gasto ven
// la misma cuota aunque sus tarjetas cierren en días distintos.
function indicePrimeraCuotaGuardada(primeraCuota) {
  const m = /^(\d{4})-(\d{2})$/.exec(primeraCuota || '');
  return m ? Number(m[1]) * 12 + Number(m[2]) - 1 : null;
}

// Índice de mes (año*12+mes) del vencimiento en que se cobra la primera cuota:
// la compra entra en el primer cierre >= fecha de compra.
function indicePrimeraCuota(compra, { c0, v0, c1, v1 }) {
  if (compra > c1) {
    let k = 1;
    while (compra > addMonths(c1, k) && k < 600) k++;
    return monthIndex(v1) + k;
  }
  if (compra > c0) return monthIndex(v1);
  let k = 0;
  while (compra <= addMonths(c0, -(k + 1)) && k < 600) k++;
  return monthIndex(v0) - k;
}

// Cuotas restantes incluyendo la del resumen actual (el que vence en v0).
// Compras del resumen abierto todavía no cobraron ninguna → devuelve `cuotas`.
// Sin fechas de tarjeta cae al cálculo por mes calendario.
export function calcularCuotasRestantesCredito(fecha, cuotas, mydata, hoy = new Date(), primeraCuota = null) {
  const fechaCompra = parseFecha(fecha);
  if (!isValidDate(fechaCompra)) return 'N/A';
  const total = parseInt(cuotas, 10) || 1;

  const ciclo = getCicloTarjeta(mydata, hoy);
  const guardada = indicePrimeraCuotaGuardada(primeraCuota);
  if (!ciclo && guardada == null) return calcularCuotasRestantes(fecha, total, hoy);

  const cuotaActual = guardada != null
    ? monthIndex(hoy) - guardada + 1
    : monthIndex(ciclo.v0) - indicePrimeraCuota(fechaCompra, ciclo) + 1;
  if (cuotaActual < 1) return total;
  return Math.max(0, total - cuotaActual + 1);
}

export const calcularCuotasRestantes = (fecha, cuotas, hoy = new Date()) => {
  const fechaCompra = parseFecha(fecha);
  if (!isValidDate(fechaCompra)) return 'N/A';
  const diferenciaMeses = monthIndex(hoy) - monthIndex(fechaCompra);
  const cuotasRestantes = parseInt(cuotas, 10) - diferenciaMeses;
  return cuotasRestantes < 0 ? 0 : cuotasRestantes;
};

export function getCuotasRestantes(gasto, mydata, hoy = new Date()) {
  if (gasto.isFijo) return '∞';
  if (gasto.tipo === 'credito') {
    return calcularCuotasRestantesCredito(gasto.fecha, gasto.cuotas, mydata, hoy, gasto.primeraCuota);
  }
  return calcularCuotasRestantes(gasto.fecha, gasto.cuotas, hoy);
}

// Returns the month index (year*12+month) when the first installment fires for a
// credit expense. Falls back to purchase month when billing dates aren't set.
export function getCreditoBillingStartIndex(gasto, mydata, hoy = new Date()) {
  const fechaCompra = parseFecha(gasto.fecha);
  if (!isValidDate(fechaCompra)) return NaN;
  const guardada = indicePrimeraCuotaGuardada(gasto.primeraCuota);
  if (guardada != null) return guardada;
  const ciclo = getCicloTarjeta(mydata, hoy);
  if (!ciclo) return monthIndex(fechaCompra);
  return indicePrimeraCuota(fechaCompra, ciclo);
}

// Returns the month index (year*12+month) where a single-cuota credit expense
// belongs in the dashboard — the billing month, not the purchase month.
// Falls back to purchase month for old/paid expenses or when dates aren't set.
export function getSingleCuotaBillingIndex(gasto, mydata, hoy = new Date()) {
  const fechaCompra = parseFecha(gasto.fecha);
  if (!isValidDate(fechaCompra)) return NaN;
  const remaining = calcularCuotasRestantesCredito(gasto.fecha, gasto.cuotas, mydata, hoy, gasto.primeraCuota);
  if (!remaining || remaining <= 0) return monthIndex(fechaCompra);
  return getCreditoBillingStartIndex(gasto, mydata, hoy);
}

// Returns false when a credit expense was purchased after the last closing date
// and hasn't been charged yet (first charge will appear next month).
export function gastoEntraEsteMes(gasto, mydata, hoy = new Date()) {
  if (gasto.isFijo) return true;
  if (gasto.tipo !== 'credito') return true;
  const fechaCompra = parseFecha(gasto.fecha);
  if (!isValidDate(fechaCompra)) return true;
  const guardada = indicePrimeraCuotaGuardada(gasto.primeraCuota);
  if (guardada != null) return guardada <= monthIndex(hoy);
  const ciclo = getCicloTarjeta(mydata, hoy);
  if (!ciclo) return true;
  return fechaCompra <= ciclo.c0;
}

// Monto efectivo mensual de una deuda: cuota actual si está en cuotas de crédito,
// monto total si es pago único o fija. Devuelve 0 cuando la compra en cuotas se hizo
// después del cierre y la primera cuota todavía no se factura este mes (entra el
// mes siguiente) — misma regla que gastoEntraEsteMes usa para gastos.
export function montoMensualDeuda(deuda, mydata) {
  if (deuda.isFijo) return deuda.monto;
  const gastoLike = { ...deuda, fecha: deuda.fechaDeuda };
  if (!gastoEntraEsteMes(gastoLike, mydata)) return 0;
  const cuotas = parseInt(deuda.cuotas) || 1;
  if (cuotas <= 1) return deuda.monto;
  const restantes = getCuotasRestantes(gastoLike, mydata);
  const restantesNum = Number(restantes);
  if (!isNaN(restantesNum) && restantesNum <= 0) return 0;
  return deuda.monto / cuotas;
}
