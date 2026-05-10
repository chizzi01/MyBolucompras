export function parseFecha(fechaDDMMYYYY) {
  if (!fechaDDMMYYYY) return new Date(NaN);
  const [d, m, y] = fechaDDMMYYYY.split('/');
  return new Date(`${y}-${m}-${d}`);
}

export function formatFecha(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

export function parsePrecio(valor) {
  if (typeof valor === 'number') return isNaN(valor) ? 0 : valor;
  if (!valor) return 0;
  const limpio = String(valor).replace(/\$|\s/g, '').trim();
  if (/^\d+(\.\d+)?$/.test(limpio)) return Number(limpio);
  return Number(limpio.replace(/\./g, '').replace(',', '.')) || 0;
}

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

export function formatPrecio(precioRaw, moneda = 'ARS') {
  const num = parsePrecio(precioRaw);
  const simbolo = getCurrencySymbol(moneda);
  return `${simbolo} ${formatARS(num)}`;
}
