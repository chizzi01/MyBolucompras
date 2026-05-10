import { parseFecha } from './formatters';

export const calcularCuotasRestantesCredito = (
  fecha, cuotas, fechaVencimiento, fechaCierre, fechaVencimientoAnterior, fechaCierreAnterior
) => {
  const fechaCompra = parseFecha(fecha);
  if (isNaN(fechaCompra)) return 'N/A';

  const fechaVenc = fechaVencimiento ? new Date(fechaVencimiento) : null;
  const fechaCierreDate = fechaCierre ? new Date(fechaCierre) : null;
  const fechaCierreAnteriorDate = fechaCierreAnterior ? new Date(fechaCierreAnterior) : null;

  const vencOk = fechaVenc && !isNaN(fechaVenc);
  const cierreOk = fechaCierreDate && !isNaN(fechaCierreDate);
  const cierreAntOk = fechaCierreAnteriorDate && !isNaN(fechaCierreAnteriorDate);

  if (!vencOk || !cierreOk) {
    const hoy = new Date();
    const diferenciaMeses =
      (hoy.getFullYear() - fechaCompra.getFullYear()) * 12 +
      (hoy.getMonth() - fechaCompra.getMonth());
    const restantes = parseInt(cuotas, 10) - diferenciaMeses;
    return restantes < 0 ? 0 : restantes;
  }

  if (cierreAntOk && fechaCompra > fechaCierreAnteriorDate && fechaCompra <= fechaCierreDate) {
    return parseInt(cuotas, 10);
  }

  const diferenciaMeses =
    (fechaVenc.getFullYear() - fechaCompra.getFullYear()) * 12 +
    (fechaVenc.getMonth() - fechaCompra.getMonth());
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
