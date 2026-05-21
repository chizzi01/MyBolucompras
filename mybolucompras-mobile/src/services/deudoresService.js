import { supabase } from '../lib/supabase';

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

  async crear(deuda) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');
    const { data, error } = await supabase
      .from('deudores')
      .insert([{ ...mapToDB(deuda), user_id: user.id }])
      .select()
      .single();
    if (error) throw error;
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

  async marcarPagada(id) {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('deudores')
      .update({ pagado: true, fecha_pago: today })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapFromDB(data);
  },

  async eliminar(id) {
    const { error } = await supabase.from('deudores').delete().eq('id', id);
    if (error) throw error;
  },
};

function mapFromDB(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion || '',
    monto: Number(row.monto),
    moneda: row.moneda || 'ARS',
    medio: row.medio || '',
    tipo: row.tipo || 'transferencia',
    pagado: row.pagado ?? false,
    fechaDeuda: row.fecha_deuda ? row.fecha_deuda.split('-').reverse().join('/') : '',
    fechaPago: row.fecha_pago ? row.fecha_pago.split('-').reverse().join('/') : null,
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
    pagado: deuda.pagado ?? false,
    fecha_deuda: fechaDeudaISO || new Date().toISOString().split('T')[0],
    fecha_pago: fechaPagoISO,
  };
}
