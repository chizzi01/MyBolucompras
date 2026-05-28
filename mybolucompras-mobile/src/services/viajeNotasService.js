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
      completado: row.completado,
      createdBy: row.created_by,
      autorNombre: row.autor?.nombre || row.autor?.email || '',
      createdAt: row.created_at,
    }));
  },

  async agregarItem(viajeId, texto) {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) throw new Error('No autenticado');
    const { data, error } = await supabase
      .from('viaje_checklist')
      .insert([{ viaje_id: viajeId, texto, created_by: user.id }])
      .select('*, autor:created_by(id, nombre, email)')
      .single();
    if (error) throw error;
    return { id: data.id, texto: data.texto, completado: data.completado, createdBy: data.created_by, autorNombre: data.autor?.nombre || data.autor?.email || '', createdAt: data.created_at };
  },

  async toggleItem(itemId, completado) {
    const { error } = await supabase
      .from('viaje_checklist')
      .update({ completado })
      .eq('id', itemId);
    if (error) throw error;
  },

  async eliminarItem(itemId) {
    const { error } = await supabase.from('viaje_checklist').delete().eq('id', itemId);
    if (error) throw error;
  },

  async getNotas(viajeId) {
    const { data, error } = await supabase
      .from('viaje_notas')
      .select('*, autor:created_by(id, nombre, email)')
      .eq('viaje_id', viajeId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(row => ({
      id: row.id,
      texto: row.texto,
      createdBy: row.created_by,
      autorNombre: row.autor?.nombre || row.autor?.email || '',
      createdAt: row.created_at,
    }));
  },

  async agregarNota(viajeId, texto) {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) throw new Error('No autenticado');
    const { data, error } = await supabase
      .from('viaje_notas')
      .insert([{ viaje_id: viajeId, texto, created_by: user.id }])
      .select('*, autor:created_by(id, nombre, email)')
      .single();
    if (error) throw error;
    return { id: data.id, texto: data.texto, createdBy: data.created_by, autorNombre: data.autor?.nombre || data.autor?.email || '', createdAt: data.created_at };
  },

  async eliminarNota(notaId) {
    const { error } = await supabase.from('viaje_notas').delete().eq('id', notaId);
    if (error) throw error;
  },

  subscribeChecklist(viajeId, onChange) {
    return supabase
      .channel(`checklist:${viajeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'viaje_checklist', filter: `viaje_id=eq.${viajeId}` }, () => onChange())
      .subscribe();
  },
};
