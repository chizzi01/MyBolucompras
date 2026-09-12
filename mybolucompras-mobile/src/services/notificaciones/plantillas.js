// src/services/notificaciones/plantillas.js
// Reglas de extracción por banco, basadas en el texto real de sus
// notificaciones de compra. Cada plantilla intenta matchear; si no matchea
// devuelve null y el orquestador (parser.js) sigue probando las demás o cae
// al fallback de IA.

function parseMontoBancario(valor) {
  const limpio = String(valor).replace(/\s/g, '');
  if (limpio.includes(',')) {
    return Number(limpio.replace(/\./g, '').replace(',', '.')) || 0;
  }
  return Number(limpio.replace(/\./g, '')) || 0;
}

function normalizarTipo(valor) {
  const v = valor.toLowerCase();
  if (v.startsWith('d')) return 'debito';
  if (v.startsWith('c')) return 'credito';
  return null;
}

const PLANTILLAS = [
  {
    banco: 'Galicia',
    // Notificación real confirmada por el usuario:
    //   título: "Pagaste: $12.000"
    //   cuerpo: "A MANTECA LB-MANTECA LB HE con tu Visa Débito 2665 a las 14:35"
    // La fecha/hora no se extrae del texto (no trae día/mes): se usa el
    // timestamp de la notificación, que el orquestador agrega por fuera.
    extraer(titulo, texto) {
      const montoMatch = titulo.match(/Pagaste:\s*\$\s*([\d.,]+)/i);
      const comercioMatch = texto.match(/^A\s+(.+?)\s+con tu/i);
      const medioMatch = texto.match(
        /con tu\s+(Visa|Mastercard|American Express)\s+(D[ée]bito|Cr[ée]dito)\s+(\d{4})/i,
      );
      if (!montoMatch || !comercioMatch || !medioMatch) return null;
      return {
        monto: parseMontoBancario(montoMatch[1]),
        moneda: 'ARS',
        comercio_raw: comercioMatch[1].trim(),
        medio: medioMatch[1],
        tipo: normalizarTipo(medioMatch[2]),
        ultimos4: medioMatch[3],
      };
    },
  },
];

module.exports = { PLANTILLAS, parseMontoBancario, normalizarTipo };
