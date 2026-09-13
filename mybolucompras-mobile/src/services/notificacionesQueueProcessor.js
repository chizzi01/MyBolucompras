// src/services/notificacionesQueueProcessor.js
import { notificationListenerBridge } from './notificationListenerBridge';
import { parsearNotificacion } from './notificaciones/parser';
import { esDuplicado } from './notificaciones/dedup';
import { notificacionesPendientesService } from './notificacionesPendientesService';

export async function procesarColaDeNotificaciones({ apiKey }) {
  const cola = await notificationListenerBridge.leerYVaciarCola();
  if (cola.length === 0) return 0;

  // Copia local: además de lo ya guardado en Supabase, se le van agregando
  // los candidatos creados en esta misma pasada — sin esto, dos
  // notificaciones duplicadas que llegan en el mismo drenado (ej. el banco
  // reenvía la misma notificación dos veces) no se detectarían entre sí,
  // porque `recientes` solo reflejaría el estado ANTES de este batch.
  const recientes = await notificacionesPendientesService.getRecientes();

  let creadas = 0;
  for (const entrada of cola) {
    try {
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
        estado: 'pendiente',
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
      recientes.push(candidata);
      creadas += 1;
    } catch (err) {
      // Una notificación individual nunca debe tirar abajo el resto del
      // batch: la cola ya se vació al leerla (leerYVaciarCola es
      // destructivo), así que un throw sin capturar acá perdería en
      // silencio todas las entradas restantes de esta pasada, no solo la
      // que falló.
      console.warn('[notificacionesQueueProcessor] error al procesar una notificación:', err?.message ?? err);
    }
  }
  return creadas;
}
