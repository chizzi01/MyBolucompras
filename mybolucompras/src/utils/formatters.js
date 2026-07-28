/** DD/MM/YYYY -> Date (sin desplazamiento de zona horaria) */
export function parseFecha(fechaDDMMYYYY) {
  if (!fechaDDMMYYYY) return new Date(NaN);
  const [d, m, y] = fechaDDMMYYYY.split('/');
  return new Date(`${y}-${m}-${d}`);
}

/** Date -> DD/MM/YYYY */
export function formatFecha(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

/**
 * Parsea un precio en cualquier formato al número nativo.
 * Soporta: '$ 1.234,56' | '1234.56' | '1234,56' | número
 */
export function parsePrecio(valor) {
  if (typeof valor === 'number') return isNaN(valor) ? 0 : valor;
  if (!valor) return 0;
  const limpio = String(valor).replace(/\$|\s/g, '').trim();
  // Formato anglosajón: solo punto decimal
  if (/^\d+(\.\d+)?$/.test(limpio)) return Number(limpio);
  // Formato argentino: puntos de miles y coma decimal (1.234,56)
  return Number(limpio.replace(/\./g, '').replace(',', '.')) || 0;
}

/** Formatea un número en es-AR con 2 decimales */
export function formatARS(value) {
  const n = Number(value);
  if (isNaN(n)) return '0,00';
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export const CURRENCY_SYMBOLS = {
  ARS: '$', USD: 'US$', EUR: '€', BRL: 'R$',
  CLP: 'CLP$', UYU: 'UY$', GBP: '£', JPY: '¥',
};

export function getCurrencySymbol(code) {
  return CURRENCY_SYMBOLS[code] || '$';
}

export function formatRangoFechas(fechaDesde, fechaHasta) {
  if (!fechaDesde || !fechaHasta) return null;
  const start = new Date(`${fechaDesde}T00:00:00`);
  const end = new Date(`${fechaHasta}T00:00:00`);
  if (isNaN(start) || isNaN(end)) return null;
  const currentYear = new Date().getFullYear();
  const crossesYear = start.getFullYear() !== currentYear || end.getFullYear() !== currentYear;
  const opts = crossesYear
    ? { day: '2-digit', month: 'short', year: 'numeric' }
    : { day: '2-digit', month: 'short' };
  const startLabel = start.toLocaleDateString('es-AR', opts);
  const endLabel = end.toLocaleDateString('es-AR', opts);
  return `${startLabel} - ${endLabel}`;
}
