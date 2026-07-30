// src/services/viajeActividadesService.js
import { supabase } from '../lib/supabase';

export const viajeActividadesService = {
  async getByViaje(viajeId) {
    const { data, error } = await supabase
      .from('viaje_actividades')
      .select('*')
      .eq('viaje_id', viajeId)
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true, nullsFirst: false });
    if (error) throw error;
    return data.map(mapFromDB);
  },

  async crear(viajeId, actividad, userId) {
    const { data, error } = await supabase
      .from('viaje_actividades')
      .insert([{
        viaje_id: viajeId,
        fecha: actividad.fecha,
        hora: actividad.hora || null,
        titulo: actividad.titulo,
        ubicacion: actividad.ubicacion || null,
        nota: actividad.nota || null,
        created_by: userId,
      }])
      .select()
      .single();
    if (error) throw error;
    return mapFromDB(data);
  },

  async editar(id, campos) {
    const update = {};
    if (campos.hora !== undefined) update.hora = campos.hora || null;
    if (campos.titulo !== undefined) update.titulo = campos.titulo;
    if (campos.ubicacion !== undefined) update.ubicacion = campos.ubicacion || null;
    if (campos.nota !== undefined) update.nota = campos.nota || null;
    const { data, error } = await supabase
      .from('viaje_actividades')
      .update(update)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapFromDB(data);
  },

  async eliminar(id) {
    const { error } = await supabase.from('viaje_actividades').delete().eq('id', id);
    if (error) throw error;
  },
};

function mapFromDB(row) {
  return {
    id: row.id,
    fecha: row.fecha,
    hora: row.hora,
    titulo: row.titulo,
    ubicacion: row.ubicacion || '',
    nota: row.nota || '',
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}
