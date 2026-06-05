// src/services/viajeGastosService.js
import { supabase } from '../lib/supabase';

export const viajeGastosService = {
  async getByViaje(viajeId) {
    const { data, error } = await supabase
      .from('viaje_gastos')
      .select(`
        *,
        pagador:pagado_por(id, nombre, email)
      `)
      .eq('viaje_id', viajeId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(row => ({
      id: row.id,
      objeto: row.objeto || '',
      precio: Number(row.precio),
      fecha: row.fecha || '',
      etiqueta: row.etiqueta || '',
      pagadoPor: row.pagado_por,
      pagadorNombre: row.pagador?.nombre || row.pagador?.email || row.pagado_por,
      modoSplit: row.modo_split,
      participantes: row.participantes || [],
      createdAt: row.created_at,
    }));
  },

  async agregarGasto(viajeId, gastoData, splitConfig, viajeParticipantes) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { modoSplit, participanteIds } = splitConfig;
    const participantesIds = modoSplit === 'todos'
      ? viajeParticipantes.map(p => p.userId)
      : modoSplit === 'algunos'
        ? participanteIds
        : [gastoData.pagadoPor || user.id];

    const fechaISO = gastoData.fecha?.includes('/')
      ? gastoData.fecha.split('/').reverse().join('-')
      : (gastoData.fecha || new Date().toISOString().split('T')[0]);

    const { error } = await supabase.from('viaje_gastos').insert([{
      viaje_id: viajeId,
      objeto: gastoData.objeto,
      precio: Number(gastoData.precio),
      fecha: fechaISO,
      etiqueta: gastoData.etiqueta || null,
      pagado_por: gastoData.pagadoPor || user.id,
      modo_split: modoSplit,
      participantes: participantesIds,
    }]);
    if (error) throw error;
  },

  async eliminarGasto(gastoId) {
    const { error } = await supabase.from('viaje_gastos').delete().eq('id', gastoId);
    if (error) throw error;
  },

  calcularBalance(viajeGastos, participantes, pagos = []) {
    const nets = {};
    for (const p of participantes) nets[p.userId] = 0;

    for (const g of viajeGastos) {
      if (g.modoSplit === 'solo') continue;
      const ids = g.participantes.length ? g.participantes : participantes.map(p => p.userId);
      const n = ids.length;
      const perPersona = g.precio / n;
      const payerInSplit = ids.includes(g.pagadoPor);
      nets[g.pagadoPor] = (nets[g.pagadoPor] || 0) + g.precio - (payerInSplit ? perPersona : 0);
      for (const id of ids) {
        if (id !== g.pagadoPor) nets[id] = (nets[id] || 0) - perPersona;
      }
    }

    for (const p of pagos) {
      nets[p.pagadorId] = (nets[p.pagadorId] || 0) + p.monto;
      nets[p.receptorId] = (nets[p.receptorId] || 0) - p.monto;
    }

    const porPersona = participantes.map(p => ({
      userId: p.userId,
      nombre: p.nombre,
      total: viajeGastos.filter(g => g.pagadoPor === p.userId).reduce((s, g) => s + g.precio, 0),
      neto: Math.round((nets[p.userId] || 0) * 100) / 100,
    }));

    const creditors = porPersona.filter(p => p.neto > 0.01).map(p => ({ ...p }));
    const debtors   = porPersona.filter(p => p.neto < -0.01).map(p => ({ ...p }));
    creditors.sort((a, b) => b.neto - a.neto);
    debtors.sort((a, b) => a.neto - b.neto);

    const liquidacion = [];
    let ci = 0, di = 0;
    while (ci < creditors.length && di < debtors.length) {
      const amount = Math.min(creditors[ci].neto, -debtors[di].neto);
      liquidacion.push({
        de: debtors[di].userId, deNombre: debtors[di].nombre,
        hacia: creditors[ci].userId, haciaNombre: creditors[ci].nombre,
        monto: Math.round(amount * 100) / 100,
      });
      creditors[ci].neto -= amount;
      debtors[di].neto  += amount;
      if (creditors[ci].neto < 0.01) ci++;
      if (-debtors[di].neto  < 0.01) di++;
    }

    return { porPersona, liquidacion };
  },
};
