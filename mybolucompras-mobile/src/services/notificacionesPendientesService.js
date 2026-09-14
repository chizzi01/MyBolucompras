import { supabase } from '../lib/supabase';

export const notificacionesPendientesService = {
  async getPendientes() {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('notificaciones_pendientes')
      .select('*')
      .eq('user_id', user.id)
      .eq('estado', 'pendiente')
      .order('fecha_detectada', { ascending: false });
    if (error) throw error;
    return data.map(mapFromDB);
  },

  // Trae también confirmadas/descartadas recientes, usadas por dedup.js para
  // no re-insertar algo que ya se procesó.
  async getRecientes() {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) throw new Error('No autenticado');

    const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('notificaciones_pendientes')
      .select('monto, ultimos4, fecha_detectada, estado')
      .eq('user_id', user.id)
      .gte('fecha_detectada', desde);
    if (error) throw error;
    return data;
  },

  async crear(datos) {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('notificaciones_pendientes')
      .insert([{ ...mapToDB(datos), user_id: user.id }])
      .select()
      .single();
    if (error) throw error;
    return mapFromDB(data);
  },

  async confirmar(id, gastoId) {
    const { data, error } = await supabase
      .from('notificaciones_pendientes')
      .update({ estado: 'confirmado', gasto_id: gastoId })
      .eq('id', id)
      .select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('confirmar no afectó ninguna fila (RLS o id inexistente)');
  },

  async descartar(id) {
    const { data, error } = await supabase
      .from('notificaciones_pendientes')
      .update({ estado: 'descartado' })
      .eq('id', id)
      .select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('descartar no afectó ninguna fila (RLS o id inexistente)');
  },
};

export function mapFromDB(row) {
  return {
    id: row.id,
    banco: row.banco || null,
    bancoPackage: row.banco_package || null,
    textoRaw: row.texto_raw,
    monto: row.monto != null ? Number(row.monto) : null,
    moneda: row.moneda || null,
    comercioRaw: row.comercio_raw || null,
    ultimos4: row.ultimos4 || null,
    medio: row.medio || null,
    tipo: row.tipo || null,
    fuente: row.fuente || null,
    fechaDetectada: row.fecha_detectada,
    estado: row.estado,
    gastoId: row.gasto_id || null,
    createdAt: row.created_at,
  };
}

export function mapToDB(datos) {
  return {
    banco: datos.banco || null,
    banco_package: datos.bancoPackage || null,
    texto_raw: datos.textoRaw,
    monto: datos.monto ?? null,
    moneda: datos.moneda || null,
    comercio_raw: datos.comercioRaw || null,
    ultimos4: datos.ultimos4 || null,
    medio: datos.medio || null,
    tipo: datos.tipo || null,
    fuente: datos.fuente || null,
    fecha_detectada: datos.fechaDetectada,
  };
}
