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

export function formatPrecioEuropeo(precioRaw, moneda = 'ARS') {
  const num = parsePrecio(precioRaw);
  const simbolo = getCurrencySymbol(moneda);
  if (isNaN(num)) return `${simbolo} 0,00`;
  
  const partes = num.toFixed(2).split('.');
  const entero = partes[0];
  const decimales = partes[1];
  
  // Add thousands separator with dots
  const enteroDot = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return `${simbolo} ${enteroDot},${decimales}`;
}

/**
 * Formatea un valor numérico para mostrar en inputs mientras el usuario escribe.
 * Muestra símbolo de moneda, miles con punto y decimales con coma.
 * No agrega decimales automáticamente mientras se sigue escribiendo.
 */
export function formatPrecioInputDisplay(precioRaw, moneda = 'ARS') {
  if (precioRaw === '' || precioRaw === null || precioRaw === undefined) return '';
  const simbolo = getCurrencySymbol(moneda);
  const raw = String(precioRaw);

  // Si el raw ya es un número decimal limpio (lo que guarda el estado internamente)
  // lo formateamos con separadores europeos
  const num = Number(raw);
  if (isNaN(num) || num === 0) return '';

  const partes = num.toFixed(2).split('.');
  const entero = partes[0];
  const decimales = partes[1];
  const enteroDot = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${simbolo} ${enteroDot},${decimales}`;
}

/**
 * Formatea para el campo de edición: sin decimales innecesarios (.00)
 * para que se vea limpio al abrir el modal de edición.
 */
export function formatPrecioParaEditar(precioRaw, moneda = 'ARS') {
  if (!precioRaw) return '';
  const simbolo = getCurrencySymbol(moneda);
  const num = parsePrecio(precioRaw);
  if (isNaN(num) || num === 0) return '';

  // Si es entero no mostramos decimales, si tiene decimales los mostramos
  const tieneDecimales = num % 1 !== 0;
  const partes = num.toFixed(tieneDecimales ? 2 : 0).split('.');
  const entero = partes[0];
  const enteroDot = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  if (tieneDecimales) {
    return `${simbolo} ${enteroDot},${partes[1]}`;
  }
  return `${simbolo} ${enteroDot}`;
}

/**
 * Formatea el precio EN TIEMPO REAL mientras el usuario tipea.
 * Recibe el texto crudo del TextInput y devuelve:
 *   - display: string formateado para mostrar (ej: "$ 1.234,5")
 *   - cleanValue: número limpio para el backend (ej: "1234.5")
 *
 * Reglas:
 *   - Separador de miles: punto (.)
 *   - Separador decimal: coma (,)
 *   - Máximo 2 decimales
 */
export function formatPrecioLive(val, moneda = 'ARS') {
  const simbolo = getCurrencySymbol(moneda);

  // Extraemos solo dígitos y comas del texto (ignoramos $, puntos de miles, espacios)
  const soloDigitosYComa = String(val || '').replace(/[^\d,]/g, '');

  if (!soloDigitosYComa) {
    return { display: '', cleanValue: '' };
  }

  // Si el usuario solo escribió una coma, mostrar "$ 0,"
  if (soloDigitosYComa === ',') {
    return { display: `${simbolo} 0,`, cleanValue: '0' };
  }

  // Separamos parte entera y decimal (usamos la PRIMERA coma como separador decimal)
  const primeraComa = soloDigitosYComa.indexOf(',');
  const tieneDecimal = primeraComa !== -1;

  let intPart = tieneDecimal
    ? soloDigitosYComa.slice(0, primeraComa)
    : soloDigitosYComa;
  const decPart = tieneDecimal
    ? soloDigitosYComa.slice(primeraComa + 1).slice(0, 2) // max 2 decimales
    : '';

  // Limpiamos ceros a la izquierda (ej: "007" → "7", pero "0" → "0")
  intPart = intPart.replace(/^0+(?=\d)/, '') || (tieneDecimal ? '0' : '');

  if (!intPart && !tieneDecimal) {
    return { display: '', cleanValue: '' };
  }

  // Formateamos la parte entera con puntos como separadores de miles
  const intFormateado = (intPart || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  // Construimos el display
  let display = `${simbolo} ${intFormateado}`;
  if (tieneDecimal) {
    display += `,${decPart}`;
  }

  // Valor limpio para backend (punto como decimal, sin símbolo ni miles)
  const cleanValue = tieneDecimal
    ? `${intPart || '0'}.${decPart}`
    : (intPart || '');

  return { display, cleanValue };
}

