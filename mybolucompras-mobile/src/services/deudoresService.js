import { supabase } from '../lib/supabase';
import { formatPrecio } from '../utils/formatters';
import { sendPushToUser } from './pushNotificationService';

export const deudoresService = {
  async getAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('deudores')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(mapFromDB);
  },

  async crear(deuda, sharedWith = null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    let finalDeuda = { ...deuda };
    if (sharedWith?.nombre) finalDeuda.compartidoConNombre = sharedWith.nombre;
    if (sharedWith?.userId) finalDeuda.compartidoConUserId = sharedWith.userId;

    const ownerInsert = supabase
      .from('deudores')
      .insert([{ ...mapToDB(finalDeuda), user_id: user.id }])
      .select()
      .single();

    if (!sharedWith?.userId) {
      const { data, error } = await ownerInsert;
      if (error) throw error;
      return mapFromDB(data);
    }

    const nombreCreador = user.user_metadata?.nombre || user.email;

    let fechaISO = finalDeuda.fechaDeuda;
    if (fechaISO?.includes('/')) fechaISO = fechaISO.split('/').reverse().join('-');
    fechaISO = fechaISO || new Date().toISOString().split('T')[0];

    const gastoParaOtro = {
      es_fijo: finalDeuda.isFijo ?? false,
      objeto: finalDeuda.descripcion || `Deuda con ${nombreCreador}`,
      fecha: fechaISO,
      medio: finalDeuda.medio || null,
      cuotas: parseInt(finalDeuda.cuotas) || 1,
      tipo: ['debito', 'credito'].includes(finalDeuda.tipo) ? finalDeuda.tipo : null,
      moneda: finalDeuda.moneda || 'ARS',
      banco: null,
      cantidad: parseInt(finalDeuda.cantidad) || 1,
      precio: Number(finalDeuda.monto) || 0,
      etiqueta: null,
      compartido_con_nombre: nombreCreador,
      compartido_con_user_id: user.id,
      pagado: false,
      user_id: sharedWith.userId,
    };

    const deudaParaOtro = {
      nombre: nombreCreador,
      descripcion: finalDeuda.descripcion || null,
      monto: Number(finalDeuda.monto) || 0,
      moneda: finalDeuda.moneda || 'ARS',
      medio: finalDeuda.medio || null,
      tipo: finalDeuda.tipo || 'transferencia',
      es_fijo: finalDeuda.isFijo ?? false,
      cuotas: parseInt(finalDeuda.cuotas) || 1,
      cantidad: parseInt(finalDeuda.cantidad) || 1,
      pagado: false,
      fecha_deuda: fechaISO,
      fecha_pago: null,
      compartido_con_nombre: nombreCreador,
      compartido_con_user_id: user.id,
      es_acreedor: false,
      user_id: sharedWith.userId,
    };

    const [
      { data, error },
      { error: gastoError },
      { error: deudaError },
    ] = await Promise.all([
      ownerInsert,
      supabase.from('gastos').insert([gastoParaOtro]),
      supabase.from('deudores').insert([deudaParaOtro]),
    ]);
    if (error) throw error;
    if (gastoError) throw gastoError;
    if (deudaError) throw deudaError;

    sendPushToUser(sharedWith.userId, {
      title: '💰 Nueva deuda registrada',
      body: `${nombreCreador} registró que le debés ${formatPrecio(deuda.monto, deuda.moneda)}`,
      data: { screen: 'Deudores' },
    });

    return mapFromDB(data);
  },

  async actualizar(id, deuda) {
    const { data, error } = await supabase
      .from('deudores')
      .update(mapToDB(deuda))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapFromDB(data);
  },

  async marcarPagadaConNotificacion(id, deudaActual, currentUserName) {
    const { data: { user } } = await supabase.auth.getUser();
    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('deudores')
      .update({ pagado: true, fecha_pago: today })
      .eq('id', id);
    if (error) throw error;

    if (deudaActual.compartidoConUserId && user) {
      const otroUserId = deudaActual.compartidoConUserId;
      const monto = deudaActual.monto;

      await Promise.all([
        // Deuda del otro usuario (lado opuesto)
        supabase
          .from('deudores')
          .update({ pagado: true, fecha_pago: today })
          .eq('user_id', otroUserId)
          .eq('compartido_con_user_id', user.id)
          .eq('monto', monto)
          .eq('pagado', false),
        // Gasto del otro usuario (creado cuando se compartió la deuda)
        supabase
          .from('gastos')
          .update({ pagado: true })
          .eq('user_id', otroUserId)
          .eq('compartido_con_user_id', user.id)
          .eq('precio', monto)
          .eq('pagado', false),
        // Mi gasto si existe (en caso de que la deuda haya surgido de un gasto compartido)
        supabase
          .from('gastos')
          .update({ pagado: true })
          .eq('user_id', user.id)
          .eq('compartido_con_user_id', otroUserId)
          .eq('precio', monto)
          .eq('pagado', false),
      ]);

      sendPushToUser(otroUserId, {
        title: '✅ Deuda saldada',
        body: deudaActual.descripcion
          ? `${currentUserName} marcó como pagada "${deudaActual.descripcion}"`
          : `${currentUserName} marcó como pagada la deuda de ${deudaActual.nombre}`,
        data: { screen: 'Deudores' },
      });
    }
  },

  async enviarRecordatorio(deuda, currentUserName) {
    if (!deuda.compartidoConUserId) return;

    await supabase
      .from('deudores')
      .update({ ultimo_recordatorio: new Date().toISOString() })
      .eq('id', deuda.id);

    sendPushToUser(deuda.compartidoConUserId, {
      title: '⏰ Recordatorio de deuda',
      body: `${currentUserName} te recuerda que tenés una deuda pendiente de ${formatPrecio(deuda.monto, deuda.moneda)}`,
      data: { screen: 'Deudores' },
    });
  },

  async eliminar(id) {
    const { error } = await supabase.from('deudores').delete().eq('id', id);
    if (error) throw error;
  },
};

function mapFromDB(row) {
  return {
    id: row.id,
    isFijo: row.es_fijo ?? false,
    esAcreedor: row.es_acreedor ?? true,
    nombre: row.nombre,
    descripcion: row.descripcion || '',
    monto: Number(row.monto),
    moneda: row.moneda || 'ARS',
    medio: row.medio || '',
    tipo: row.tipo || 'transferencia',
    cuotas: row.cuotas ?? 1,
    cantidad: row.cantidad ?? 1,
    pagado: row.pagado ?? false,
    fechaDeuda: row.fecha_deuda ? row.fecha_deuda.split('-').reverse().join('/') : '',
    fechaPago: row.fecha_pago ? row.fecha_pago.split('-').reverse().join('/') : null,
    compartidoConNombre: row.compartido_con_nombre || null,
    compartidoConUserId: row.compartido_con_user_id || null,
    ultimoRecordatorio: row.ultimo_recordatorio || null,
    createdAt: row.created_at,
  };
}

function mapToDB(deuda) {
  let fechaDeudaISO = deuda.fechaDeuda;
  if (deuda.fechaDeuda?.includes('/')) {
    fechaDeudaISO = deuda.fechaDeuda.split('/').reverse().join('-');
  }
  let fechaPagoISO = null;
  if (deuda.fechaPago?.includes('/')) {
    fechaPagoISO = deuda.fechaPago.split('/').reverse().join('-');
  }
  return {
    nombre: deuda.nombre,
    descripcion: deuda.descripcion || null,
    monto: Number(deuda.monto) || 0,
    moneda: deuda.moneda || 'ARS',
    medio: deuda.medio || null,
    tipo: deuda.tipo || 'transferencia',
    es_fijo: deuda.isFijo ?? false,
    cuotas: parseInt(deuda.cuotas) || 1,
    cantidad: parseInt(deuda.cantidad) || 1,
    pagado: deuda.pagado ?? false,
    fecha_deuda: fechaDeudaISO || new Date().toISOString().split('T')[0],
    fecha_pago: fechaPagoISO,
    compartido_con_nombre: deuda.compartidoConNombre || null,
    compartido_con_user_id: deuda.compartidoConUserId || null,
    es_acreedor: deuda.esAcreedor ?? true,
  };
}
