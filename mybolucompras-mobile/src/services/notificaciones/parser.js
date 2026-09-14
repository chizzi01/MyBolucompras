// Orquesta el motor de parseo: filtro de contenido -> plantillas de reglas
// -> fallback de IA. Nunca llama a la IA si el filtro ya descartó la
// notificación o si ya hubo match por regla.

const { esNotificacionDeCompra } = require('./filtro');
const { PLANTILLAS } = require('./plantillas');
const { parseConIA } = require('./parseIA');

async function parsearNotificacion({ titulo, texto, apiKey }) {
  if (!esNotificacionDeCompra({ titulo, texto })) {
    console.log('[parser] descartada por filtro de contenido:', JSON.stringify({ titulo, texto }));
    return null;
  }

  for (const plantilla of PLANTILLAS) {
    const resultado = plantilla.extraer(titulo, texto);
    if (resultado) {
      console.log(`[parser] matcheada por plantilla ${plantilla.banco}`);
      return { ...resultado, banco: plantilla.banco, fuente: 'regla' };
    }
  }

  if (!apiKey) {
    console.log('[parser] ninguna plantilla matcheó y no hay apiKey — descartada:', JSON.stringify({ titulo, texto }));
    return null;
  }

  console.log('[parser] ninguna plantilla matcheó, cayendo al fallback de IA:', JSON.stringify({ titulo, texto }));
  const resultadoIA = await parseConIA(titulo, texto, apiKey);
  if (!resultadoIA) {
    console.log('[parser] la IA no pudo extraer una compra — descartada');
    return null;
  }

  console.log('[parser] matcheada por IA');
  return { ...resultadoIA, banco: null, fuente: 'ia' };
}

module.exports = { parsearNotificacion };
