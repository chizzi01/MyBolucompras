import { supabase } from '../lib/supabase';
import { parsePrecio } from '../utils/formatters';
import { sendPushToUser } from './pushNotificationService';

export const gastosService = {
  async getAll() {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
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
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
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
      const precioBase = parsePrecio(gasto.precio);
      const precioNum = sharedWith.mode === 'dividir' ? precioBase / 2 : precioBase;
      const fechaBase = gasto.fecha;
      const fechaISO = (fechaBase?.includes('/')
        ? fechaBase.split('/').reverse().join('-')
        : fechaBase) || new Date().toISOString().split('T')[0];

      const otherGasto = {
        ...finalGasto,
        objeto: `${finalGasto.objeto} (Compartido por ${nombreCreador})`,
        compartidoConNombre: nombreCreador,
        compartidoConUserId: user.id,
      };

      const deudaCreador = {
        nombre: sharedWith.nombre,
        descripcion: gasto.objeto,
        monto: precioNum,
        moneda: finalGasto.moneda || 'ARS',
        medio: finalGasto.medio || null,
        tipo: finalGasto.tipo || null,
        es_fijo: false,
        cuotas: finalGasto.cuotas ?? 1,
        cantidad: 1,
        pagado: false,
        fecha_deuda: fechaISO,
        fecha_pago: null,
        compartido_con_nombre: sharedWith.nombre,
        compartido_con_user_id: sharedWith.userId,
        es_acreedor: true,
        user_id: user.id,
      };

      const deudaOtro = {
        nombre: nombreCreador,
        descripcion: gasto.objeto,
        monto: precioNum,
        moneda: finalGasto.moneda || 'ARS',
        medio: finalGasto.medio || null,
        tipo: finalGasto.tipo || null,
        es_fijo: false,
        cuotas: finalGasto.cuotas ?? 1,
        cantidad: 1,
        pagado: false,
        fecha_deuda: fechaISO,
        fecha_pago: null,
        compartido_con_nombre: nombreCreador,
        compartido_con_user_id: user.id,
        es_acreedor: false,
        user_id: sharedWith.userId,
      };

      const [
        { error: gastoOtroError },
        { error: deudaCreadorError },
        { error: deudaOtroError },
      ] = await Promise.all([
        supabase.from('gastos').insert([{ ...mapToDB(otherGasto), user_id: sharedWith.userId }]),
        supabase.from('deudores').insert([deudaCreador]),
        supabase.from('deudores').insert([deudaOtro]),
      ]);
      if (gastoOtroError) throw gastoOtroError;
      if (deudaCreadorError) throw deudaCreadorError;
      if (deudaOtroError) throw deudaOtroError;

      sendPushToUser(sharedWith.userId, {
        title: '💸 Gasto compartido',
        body: `${nombreCreador} te compartió: ${gasto.objeto}`,
        data: { screen: 'Gastos' },
      });
    }

    return mapFromDB(data);
  },

  async actualizar(id, gasto, sharedWith = null) {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
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
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;

    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('gastos')
      .update({ pagado: true, fecha_pago: today })
      .eq('id', id);
    if (error) throw error;

    const otroUserId = gastoActual.compartidoConUserId;
    if (!otroUserId || !user) return;

    const precio = gastoActual.precioNum;

    await Promise.all([
      // Gasto del otro usuario — sin filtro pagado=false para que el re-marcado mensual funcione
      supabase
        .from('gastos')
        .update({ pagado: true, fecha_pago: today })
        .eq('user_id', otroUserId)
        .eq('compartido_con_user_id', user.id)
        .eq('precio', precio),
      // Mi deuda relacionada (si existe)
      supabase
        .from('deudores')
        .update({ pagado: true, fecha_pago: today })
        .eq('user_id', user.id)
        .eq('compartido_con_user_id', otroUserId)
        .eq('monto', precio),
      // Deuda del otro usuario relacionada
      supabase
        .from('deudores')
        .update({ pagado: true, fecha_pago: today })
        .eq('user_id', otroUserId)
        .eq('compartido_con_user_id', user.id)
        .eq('monto', precio),
    ]);

    sendPushToUser(otroUserId, {
      title: '✅ Pago recibido',
      body: `${currentUserName} marcó como pagado: ${gastoActual.objeto}`,
      data: { screen: 'Gastos' },
    });
  },
};

function mapFromDB(row) {
  const isMultiCuotaCompartida =
    !row.es_fijo && (row.cuotas ?? 1) > 1 && !!row.compartido_con_user_id;
  const pagado = isMultiCuotaCompartida && row.pagado && row.fecha_pago
    ? isSameYearMonth(row.fecha_pago)
    : (row.pagado ?? false);

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
    pagado,
    viajeId: row.viaje_id || null,
    viajeNombre: row.viaje_nombre || null,
  };
}

function isSameYearMonth(dateStr) {
  if (!dateStr) return false;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return dateStr.slice(0, 7) === currentMonth;
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
