import { supabase } from '../lib/supabase';

export const viajeActividadesService = {
  async getByViaje(viajeId) {
    const { data, error } = await supabase
      .from('viaje_actividades')
      .select('*, autor:created_by(id, nombre, email)')
      .eq('viaje_id', viajeId)
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true, nullsFirst: false });
    if (error) throw error;
    return data.map(mapActividad);
  },

  async crear(viajeId, { fecha, hora = null, titulo, ubicacion = null, nota = null }) {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) throw new Error('No autenticado');
    const { data, error } = await supabase
      .from('viaje_actividades')
      .insert([{ viaje_id: viajeId, fecha, hora, titulo, ubicacion, nota, created_by: user.id }])
      .select('*, autor:created_by(id, nombre, email)')
      .single();
    if (error) throw error;
    return mapActividad(data);
  },

  async editar(id, campos) {
    const update = {};
    if (campos.fecha !== undefined) update.fecha = campos.fecha;
    if ('hora' in campos) update.hora = campos.hora;
    if (campos.titulo !== undefined) update.titulo = campos.titulo;
    if ('ubicacion' in campos) update.ubicacion = campos.ubicacion;
    if ('nota' in campos) update.nota = campos.nota;
    const { data, error } = await supabase
      .from('viaje_actividades')
      .update(update)
      .eq('id', id)
      .select('*, autor:created_by(id, nombre, email)')
      .single();
    if (error) throw error;
    return mapActividad(data);
  },

  async eliminar(id) {
    const { error } = await supabase.from('viaje_actividades').delete().eq('id', id);
    if (error) throw error;
  },
};

function mapActividad(row) {
  return {
    id: row.id,
    viajeId: row.viaje_id,
    fecha: row.fecha,
    hora: row.hora ? row.hora.slice(0, 5) : null,
    titulo: row.titulo,
    ubicacion: row.ubicacion,
    nota: row.nota,
    createdBy: row.created_by,
    autorNombre: row.autor?.nombre || row.autor?.email || '',
    createdAt: row.created_at,
  };
}
