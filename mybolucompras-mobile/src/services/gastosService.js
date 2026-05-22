import { supabase } from '../lib/supabase';
import { parsePrecio } from '../utils/formatters';
import { pushNotificationService } from './pushNotificationService';

function sendPushToUser(userId, { title, body, data = {} }) {
  if (!userId) {
    console.warn('[Push] sendPushToUser called with null userId');
    return;
  }
  console.log('[Push] Looking up FCM token for userId:', userId);
  pushNotificationService.getTokenForUser(userId)
    .then(token => {
      if (!token) {
        console.warn('[Push] No FCM token found for userId:', userId);
        return;
      }
      console.log('[Push] Token found, sending notification:', title);
      return pushNotificationService.sendPushNotification({ token, title, body, data });
    })
    .catch(err => console.warn('[Push] sendPushToUser error:', err?.message));
}

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

      // Push + notificación in-app (fire-and-forget, no bloquean el flujo)
      sendPushToUser(sharedWith.userId, {
        title: '💸 Gasto compartido',
        body: `${nombreCreador} te compartió: ${gasto.objeto}`,
        data: { screen: 'Gastos' },
      });
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

      sendPushToUser(sharedWith.userId, {
        title: '💸 Gasto compartido',
        body: `${nombreCreador} te compartió: ${gasto.objeto}`,
        data: { screen: 'Gastos' },
      });
    }

    return mapFromDB(data);
  },

  async eliminar(id) {
    const { error } = await supabase.from('gastos').delete().eq('id', id);
    if (error) throw error;
  },

  async marcarPagadoConNotificacion(id, gastoActual, currentUserName) {
    const { error } = await supabase
      .from('gastos')
      .update({ pagado: true })
      .eq('id', id);

    if (error) throw error;

    const otroUserId = gastoActual.compartidoConUserId;
    if (!otroUserId) return;

    sendPushToUser(otroUserId, {
      title: '✅ Pago recibido',
      body: `${currentUserName} marcó como pagado: ${gastoActual.objeto}`,
      data: { screen: 'Gastos' },
    });
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
