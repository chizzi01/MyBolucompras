// src/services/viajesService.js
import { supabase } from '../lib/supabase';
import { sendPushToUser } from './pushNotificationService';

export const viajesService = {
  async getAll() {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('viajes')
      .select(`
        *,
        viaje_participantes(user_id, joined_at, profiles:user_id(id, nombre, email))
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(mapViaje);
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('viajes')
      .select(`
        *,
        viaje_participantes(user_id, joined_at, profiles:user_id(id, nombre, email))
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return mapViaje(data);
  },

  async crear(titulo, emoji, participanteIds, imagenUrl = null) {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) throw new Error('No autenticado');

    const { data: viaje, error } = await supabase
      .from('viajes')
      .insert([{ titulo, emoji, imagen_url: imagenUrl, created_by: user.id }])
      .select()
      .single();
    if (error) throw error;

    // Always include creator; deduplicate
    const ids = [...new Set([user.id, ...participanteIds])];
    const rows = ids.map(uid => ({ viaje_id: viaje.id, user_id: uid }));
    const { error: partError } = await supabase.from('viaje_participantes').insert(rows);
    if (partError) throw partError;

    // Trigger push notifications in background for other participants
    const otherParticipants = ids.filter(uid => uid !== user.id);
    if (otherParticipants.length > 0) {
      supabase.from('profiles').select('nombre').eq('id', user.id).single()
        .then(({ data }) => {
          const creatorName = data?.nombre || user.email?.split('@')[0] || 'Alguien';
          otherParticipants.forEach(uid => {
            sendPushToUser(uid, {
              title: `${emoji} ¡Nuevo Viaje!`,
              body: `${creatorName} te agregó al viaje "${titulo}"`,
              data: { type: 'viaje_creado', viajeId: viaje.id }
            });
          });
        })
        .catch(err => console.warn('[Push] Error getting creator profile name:', err.message));
    }

    return viajesService.getById(viaje.id);
  },

  async cerrar(id) {
    const { error } = await supabase
      .from('viajes')
      .update({ estado: 'cerrado', fecha_cierre: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async eliminar(id) {
    const { error } = await supabase.from('viajes').delete().eq('id', id);
    if (error) throw error;
  },

  async agregarParticipante(viajeId, userId) {
    const { error } = await supabase
      .from('viaje_participantes')
      .insert([{ viaje_id: viajeId, user_id: userId }]);
    if (error) throw error;
  },

  async quitarParticipante(viajeId, userId) {
    const { error } = await supabase
      .from('viaje_participantes')
      .delete()
      .eq('viaje_id', viajeId)
      .eq('user_id', userId);
    if (error) throw error;
  },

  async editarViaje(id, campos) {
    const update = {};
    if (campos.titulo !== undefined) update.titulo = campos.titulo;
    if (campos.emoji !== undefined) update.emoji = campos.emoji;
    if ('imagenUrl' in campos) update.imagen_url = campos.imagenUrl;
    const { error } = await supabase
      .from('viajes')
      .update(update)
      .eq('id', id);
    if (error) throw error;
  },
};

function mapViaje(row) {
  return {
    id: row.id,
    titulo: row.titulo,
    emoji: row.emoji,
    estado: row.estado,
    imagenUrl: row.imagen_url ?? null,
    createdBy: row.created_by,
    fechaCierre: row.fecha_cierre,
    createdAt: row.created_at,
    participantes: (row.viaje_participantes || [])
      .sort((a, b) => new Date(a.joined_at) - new Date(b.joined_at))
      .map(p => ({
        userId: p.user_id,
        nombre: p.profiles?.nombre || p.profiles?.email || p.user_id,
        email: p.profiles?.email || '',
      })),
  };
}
