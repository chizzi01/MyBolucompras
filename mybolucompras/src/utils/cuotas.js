import { parseFecha } from './formatters';

export const calcularCuotasRestantesCredito = (
  fecha, cuotas, fechaVencimiento, fechaCierre, fechaVencimientoAnterior, fechaCierreAnterior
) => {
  const fechaCompra = parseFecha(fecha);
  const fechaVenc = new Date(fechaVencimiento);
  const fechaCierreDate = new Date(fechaCierre);
  const fechaCierreAnteriorDate = fechaCierreAnterior ? new Date(fechaCierreAnterior) : null;

  if (
    isNaN(fechaCompra) || isNaN(fechaVenc) ||
    isNaN(fechaCierreDate) || isNaN(fechaCierreAnteriorDate)
  ) {
    return 'N/A';
  }

  let cuotasRestantes;
  if (fechaCompra > fechaCierreAnteriorDate && fechaCompra <= fechaCierreDate) {
    cuotasRestantes = 0;
  } else {
    const diferenciaMeses =
      (fechaVenc.getFullYear() - fechaCompra.getFullYear()) * 12 +
      (fechaVenc.getMonth() - fechaCompra.getMonth());
    cuotasRestantes = parseInt(cuotas, 10) - diferenciaMeses;
  }

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
