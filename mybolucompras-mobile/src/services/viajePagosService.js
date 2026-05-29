// src/services/viajePagosService.js
import { supabase } from '../lib/supabase';

export const viajePagosService = {
  async getByViaje(viajeId) {
    const { data, error } = await supabase
      .from('viaje_pagos')
      .select('*')
      .eq('viaje_id', viajeId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data.map(row => ({
      id: row.id,
      viajeId: row.viaje_id,
      pagadorId: row.pagador_id,
      receptorId: row.receptor_id,
      monto: Number(row.monto),
      fecha: row.fecha,
      createdAt: row.created_at,
    }));
  },

  async registrar(viajeId, pagadorId, receptorId, monto) {
    const { data, error } = await supabase
      .from('viaje_pagos')
      .insert([{ viaje_id: viajeId, pagador_id: pagadorId, receptor_id: receptorId, monto }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
