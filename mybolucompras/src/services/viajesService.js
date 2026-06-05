// src/services/viajesService.js
import { supabase } from '../lib/supabase';
import { viajeGastosService } from './viajeGastosService';
import { viajePagosService } from './viajePagosService';

export const viajesService = {
  async getAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('viajes')
      .select(`
        *,
        viaje_participantes(user_id, joined_at, profiles:user_id(id, nombre, email))
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(mapViaje).filter(v =>
      v.participantes.some(p => p.userId === user.id)
    );
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

  async crear(titulo, emoji, participanteIds) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data: viaje, error } = await supabase
      .from('viajes')
      .insert([{ titulo, emoji, created_by: user.id }])
      .select()
      .single();
    if (error) throw error;

    const ids = [...new Set([user.id, ...participanteIds])];
    const rows = ids.map(uid => ({ viaje_id: viaje.id, user_id: uid }));
    const { error: partError } = await supabase.from('viaje_participantes').insert(rows);
    if (partError) throw partError;

    return viajesService.getById(viaje.id);
  },

  async editarViaje(id, campos) {
    const update = {};
    if (campos.titulo !== undefined) update.titulo = campos.titulo;
    if (campos.emoji !== undefined) update.emoji = campos.emoji;
    const { error } = await supabase.from('viajes').update(update).eq('id', id);
    if (error) throw error;
  },

  async cerrar(id) {
    const [viaje, gastos, pagos] = await Promise.all([
      viajesService.getById(id),
      viajeGastosService.getByViaje(id),
      viajePagosService.getByViaje(id),
    ]);

    const { liquidacion } = viajeGastosService.calcularBalance(gastos, viaje.participantes, pagos);
    if (liquidacion.length > 0) {
      const nombres = [...new Set(liquidacion.map(l => l.deNombre))].join(', ');
      throw new Error(`Saldos pendientes: ${nombres}`);
    }

    const today = new Date().toISOString().split('T')[0];
    const summaryRows = viaje.participantes
      .map(p => {
        const share = gastos
          .filter(g => {
            if (g.modoSplit === 'solo') return g.pagadoPor === p.userId;
            const ids = g.participantes.length
              ? g.participantes
              : viaje.participantes.map(x => x.userId);
            return ids.includes(p.userId);
          })
          .reduce((sum, g) => {
            if (g.modoSplit === 'solo') return sum + g.precio;
            const n = g.participantes.length || viaje.participantes.length;
            return sum + g.precio / n;
          }, 0);
        return {
          es_fijo: false,
          objeto: `Gastos: ${viaje.titulo}`,
          fecha: today,
          medio: 'Transferencia',
          cuotas: 1,
          tipo: null,
          moneda: 'ARS',
          banco: null,
          cantidad: 1,
          precio: Math.round(share * 100) / 100,
          etiqueta: null,
          compartido_con_nombre: null,
          compartido_con_user_id: null,
          viaje_id: id,
          user_id: p.userId,
        };
      })
      .filter(r => r.precio > 0);

    // Insert summaries FIRST to prevent data loss if insert fails
    if (summaryRows.length > 0) {
      const { error: insertError } = await supabase.from('gastos').insert(summaryRows);
      if (insertError) throw insertError;
    }

    // Delete original gastos, but preserve the summaries we just inserted
    await supabase.from('gastos').delete().eq('viaje_id', id).not('objeto', 'like', 'Gastos:%');

    const { error } = await supabase
      .from('viajes')
      .update({ estado: 'cerrado', fecha_cierre: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async reabrir(id) {
    await supabase.from('gastos').delete().eq('viaje_id', id);
    const { error } = await supabase
      .from('viajes')
      .update({ estado: 'activo', fecha_cierre: null })
      .eq('id', id);
    if (error) throw error;
  },

  async eliminar(id) {
    const { error } = await supabase.from('viajes').delete().eq('id', id);
    if (error) throw error;
  },
};

function mapViaje(row) {
  return {
    id: row.id,
    titulo: row.titulo,
    emoji: row.emoji || '✈️',
    imagenUrl: row.imagen_url || null,
    estado: row.estado,
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
