// src/services/viajeNotasService.js
import { supabase } from '../lib/supabase';

export const viajeNotasService = {
  async getChecklist(viajeId) {
    const { data, error } = await supabase
      .from('viaje_checklist')
      .select('*, autor:created_by(id, nombre, email)')
      .eq('viaje_id', viajeId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data.map(row => ({
      id: row.id,
      texto: row.texto,
      completadosPor: row.completados_por || [],
      createdBy: row.created_by,
      autorNombre: row.autor?.nombre || row.autor?.email || row.created_by,
    }));
  },

  async getNotas(viajeId) {
    const { data, error } = await supabase
      .from('viaje_notas')
      .select('*, autor:created_by(id, nombre, email)')
      .eq('viaje_id', viajeId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data.map(row => ({
      id: row.id,
      texto: row.texto,
      createdBy: row.created_by,
      autorNombre: row.autor?.nombre || row.autor?.email || row.created_by,
      createdAt: row.created_at,
    }));
  },

  async agregarItem(viajeId, texto, userId) {
    const { error } = await supabase
      .from('viaje_checklist')
      .insert([{ viaje_id: viajeId, texto, completados_por: [], created_by: userId }]);
    if (error) throw error;
  },

  async toggleItem(itemId, userId, marcar) {
    const { data: current, error: fetchErr } = await supabase
      .from('viaje_checklist').select('completados_por').eq('id', itemId).single();
    if (fetchErr) throw fetchErr;
    const prev = current.completados_por || [];
    const next = marcar
      ? [...new Set([...prev, userId])]
      : prev.filter(id => id !== userId);
    const { error } = await supabase
      .from('viaje_checklist').update({ completados_por: next }).eq('id', itemId);
    if (error) throw error;
  },

  async eliminarItem(itemId) {
    const { error } = await supabase.from('viaje_checklist').delete().eq('id', itemId);
    if (error) throw error;
  },

  async agregarNota(viajeId, texto, userId) {
    const { error } = await supabase
      .from('viaje_notas')
      .insert([{ viaje_id: viajeId, texto, created_by: userId }]);
    if (error) throw error;
  },

  async eliminarNota(notaId) {
    const { error } = await supabase.from('viaje_notas').delete().eq('id', notaId);
    if (error) throw error;
  },

  subscribeChecklist(viajeId, callback) {
    const channel = supabase
      .channel(`viaje-checklist-${viajeId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'viaje_checklist',
        filter: `viaje_id=eq.${viajeId}`,
      }, callback)
      .subscribe();
    return channel;
  },
};
