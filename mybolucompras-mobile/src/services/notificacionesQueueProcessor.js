// src/services/notificacionesQueueProcessor.js
import { notificationListenerBridge } from './notificationListenerBridge';
import { parsearNotificacion } from './notificaciones/parser';
import { esDuplicado } from './notificaciones/dedup';
import { notificacionesPendientesService } from './notificacionesPendientesService';

export async function procesarColaDeNotificaciones({ apiKey }) {
  const cola = await notificationListenerBridge.leerYVaciarCola();
  if (cola.length === 0) return 0;

  const recientes = await notificacionesPendientesService.getRecientes();

  let creadas = 0;
  for (const entrada of cola) {
    const resultado = await parsearNotificacion({
      titulo: entrada.titulo,
      texto: entrada.texto,
      apiKey,
    });
    if (!resultado) continue;

    const candidata = {
      monto: resultado.monto,
      ultimos4: resultado.ultimos4,
      fecha_detectada: entrada.timestamp,
    };
    if (esDuplicado(candidata, recientes)) continue;

    await notificacionesPendientesService.crear({
      banco: resultado.banco,
      bancoPackage: entrada.packageName,
      textoRaw: `${entrada.titulo}\n${entrada.texto}`,
      monto: resultado.monto,
      moneda: resultado.moneda,
      comercioRaw: resultado.comercio_raw,
      ultimos4: resultado.ultimos4,
      medio: resultado.medio,
      tipo: resultado.tipo,
      fuente: resultado.fuente,
      fechaDetectada: entrada.timestamp,
    });
    creadas += 1;
  }
  return creadas;
}
