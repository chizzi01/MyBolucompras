// Orquesta el motor de parseo: filtro de contenido -> plantillas de reglas
// -> fallback de IA. Nunca llama a la IA si el filtro ya descartó la
// notificación o si ya hubo match por regla.

const { esNotificacionDeCompra } = require('./filtro');
const { PLANTILLAS } = require('./plantillas');
const { parseConIA } = require('./parseIA');

async function parsearNotificacion({ titulo, texto, apiKey }) {
  if (!esNotificacionDeCompra({ titulo, texto })) return null;

  for (const plantilla of PLANTILLAS) {
    const resultado = plantilla.extraer(titulo, texto);
    if (resultado) {
      return { ...resultado, banco: plantilla.banco, fuente: 'regla' };
    }
  }

  if (!apiKey) return null;

  const resultadoIA = await parseConIA(titulo, texto, apiKey);
  if (!resultadoIA) return null;

  return { ...resultadoIA, banco: null, fuente: 'ia' };
}

module.exports = { parsearNotificacion };
