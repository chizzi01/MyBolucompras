import { supabase } from '../lib/supabase';
import { parsePrecio } from '../utils/formatters';
import { pushNotificationService } from './pushNotificationService';

export const gastosService = {
  async getAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('gastos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(mapFromDB);
  },

  async crear(gasto, sharedWith = null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    let finalGasto = { ...gasto };

    if (sharedWith && sharedWith.mode === 'dividir') {
      finalGasto.precio = gasto.precio / 2;
    }

    if (sharedWith && sharedWith.nombre) {
      finalGasto.compartidoConNombre = sharedWith.nombre;
    }

    // El creador guarda el user_id del receptor para poder notificarlo luego
    if (sharedWith && sharedWith.userId) {
      finalGasto.compartidoConUserId = sharedWith.userId;
    }

    const { data, error } = await supabase
      .from('gastos')
      .insert([{ ...mapToDB(finalGasto), user_id: user.id }])
      .select()
      .single();

    if (error) throw error;

    if (sharedWith && sharedWith.userId) {
      const nombreCreador = user.user_metadata?.nombre || user.email;

      // La copia del receptor lleva el user_id del creador como referencia bilateral
      const otherGasto = {
        ...finalGasto,
        objeto: `${finalGasto.objeto} (Compartido por ${nombreCreador})`,
        compartidoConNombre: nombreCreador,
        compartidoConUserId: user.id,
      };

      await supabase
        .from('gastos')
        .insert([{ ...mapToDB(otherGasto), user_id: sharedWith.userId }]);

      // Notificación in-app
      await supabase
        .from('notifications')
        .insert([{
          user_id: sharedWith.userId,
          title: 'Gasto compartido',
          message: `${nombreCreador} te compartió un gasto: ${gasto.objeto}`,
          data: { gasto_id: data.id, screen: 'Gastos' },
        }]);

      // Push notification (fire-and-forget)
      pushNotificationService.getTokenForUser(sharedWith.userId).then(token => {
        pushNotificationService.sendPushNotification({
          token,
          title: 'Gasto compartido',
          body: `${nombreCreador} te compartió: ${gasto.objeto}`,
          data: { screen: 'Gastos' },
        });
      }).catch(err => console.warn('[Push] crear gasto compartido:', err?.message));
    }

    return mapFromDB(data);
  },

  async actualizar(id, gasto, sharedWith = null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    let finalGasto = { ...gasto };

    if (sharedWith && sharedWith.mode === 'dividir') {
      finalGasto.precio = gasto.precio / 2;
    }

    if (sharedWith && sharedWith.nombre) {
      finalGasto.compartidoConNombre = sharedWith.nombre;
    }

    if (sharedWith && sharedWith.userId) {
      finalGasto.compartidoConUserId = sharedWith.userId;
    }

    const { data, error } = await supabase
      .from('gastos')
      .update(mapToDB(finalGasto))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (sharedWith && sharedWith.userId) {
      const nombreCreador = user.user_metadata?.nombre || user.email;

      const otherGasto = {
        ...finalGasto,
        objeto: `${finalGasto.objeto} (Compartido por ${nombreCreador})`,
        compartidoConNombre: nombreCreador,
        compartidoConUserId: user.id,
      };

      await supabase
        .from('gastos')
        .insert([{ ...mapToDB(otherGasto), user_id: sharedWith.userId }]);

      await supabase
        .from('notifications')
        .insert([{
          user_id: sharedWith.userId,
          title: 'Gasto compartido',
          message: `${nombreCreador} te compartió un gasto: ${gasto.objeto}`,
          data: { gasto_id: data.id, screen: 'Gastos' },
        }]);

      pushNotificationService.getTokenForUser(sharedWith.userId).then(token => {
        pushNotificationService.sendPushNotification({
          token,
          title: 'Gasto compartido',
          body: `${nombreCreador} te compartió: ${gasto.objeto}`,
          data: { screen: 'Gastos' },
        });
      }).catch(err => console.warn('[Push] actualizar gasto compartido:', err?.message));
    }

    return mapFromDB(data);
  },

  async eliminar(id) {
    const { error } = await supabase.from('gastos').delete().eq('id', id);
    if (error) throw error;
  },

  // El receptor marca su copia del gasto como pagada y notifica al creador
  async marcarPagadoConNotificacion(id, gastoActual, currentUserName) {
    const { error } = await supabase
      .from('gastos')
      .update({ pagado: true })
      .eq('id', id);

    if (error) throw error;

    const creatorUserId = gastoActual.compartidoConUserId;
    if (!creatorUserId) return;

    // Notificación in-app para el creador
    await supabase
      .from('notifications')
      .insert([{
        user_id: creatorUserId,
        title: 'Pago recibido',
        message: `${currentUserName} marcó como pagado: ${gastoActual.objeto}`,
        data: { screen: 'Gastos' },
      }]);

    // Push notification al creador (fire-and-forget)
    pushNotificationService.getTokenForUser(creatorUserId).then(token => {
      pushNotificationService.sendPushNotification({
        token,
        title: 'Pago recibido 💸',
        body: `${currentUserName} te pagó: ${gastoActual.objeto}`,
        data: { screen: 'Gastos' },
      });
    }).catch(err => console.warn('[Push] marcarPagado:', err?.message));
  },
};

function mapFromDB(row) {
  return {
    id: row.id,
    isFijo: row.es_fijo,
    objeto: row.objeto,
    fecha: row.fecha ? row.fecha.split('-').reverse().join('/') : '',
    medio: row.medio,
    cuotas: row.cuotas,
    tipo: row.tipo,
    moneda: row.moneda,
    banco: row.banco || '',
    cantidad: row.cantidad,
    precio: `$ ${Number(row.precio).toFixed(2)}`,
    precioNum: Number(row.precio),
    etiqueta: row.etiqueta || '',
    compartidoConNombre: row.compartido_con_nombre || null,
    compartidoConUserId: row.compartido_con_user_id || null,
    pagado: row.pagado ?? false,
  };
}

function mapToDB(gasto) {
  const precioNumerico = parsePrecio(gasto.precio);
  let fechaISO = gasto.fecha;
  if (gasto.fecha && gasto.fecha.includes('/')) {
    fechaISO = gasto.fecha.split('/').reverse().join('-');
  }
  return {
    es_fijo: gasto.isFijo ?? false,
    objeto: gasto.objeto,
    fecha: fechaISO,
    medio: gasto.medio,
    cuotas: gasto.cuotas ?? 1,
    tipo: gasto.tipo || null,
    moneda: gasto.moneda || 'ARS',
    banco: gasto.banco || null,
    cantidad: gasto.cantidad ?? 1,
    precio: isNaN(precioNumerico) ? 0 : precioNumerico,
    etiqueta: gasto.etiqueta || null,
    compartido_con_nombre: gasto.compartidoConNombre || null,
    compartido_con_user_id: gasto.compartidoConUserId || null,
    pagado: gasto.pagado ?? false,
  };
}
