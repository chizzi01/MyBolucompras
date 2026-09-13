// src/services/notificaciones/dedup.js
// Evita crear una fila pendiente repetida cuando el banco manda la misma
// notificación dos veces (pasa con algunos bancos al reconectar la app).

const CINCO_MINUTOS_MS = 5 * 60 * 1000;

function esDuplicado(candidata, existentes) {
  return existentes.some((existente) => {
    if (existente.estado === 'descartado') return false;
    if (Number(existente.monto) !== Number(candidata.monto)) return false;
    if ((existente.ultimos4 || null) !== (candidata.ultimos4 || null)) return false;
    const diffMs = Math.abs(
      new Date(existente.fecha_detectada).getTime() - new Date(candidata.fecha_detectada).getTime(),
    );
    return diffMs <= CINCO_MINUTOS_MS;
  });
}

module.exports = { esDuplicado };
