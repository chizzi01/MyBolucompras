// src/services/viajeGastosService.js
import { supabase } from '../lib/supabase';
import { sendPushToUser } from './pushNotificationService';

export const viajeGastosService = {
  async getByViaje(viajeId) {
    const { data, error } = await supabase
      .from('viaje_gastos')
      .select(`
        *,
        gastos:gasto_id(id, objeto, precio, fecha, etiqueta),
        pagador:pagado_por(id, nombre, email)
      `)
      .eq('viaje_id', viajeId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(row => {
      const n = row.participantes?.length || 1;
      // New rows have precio stored directly; old rows (gasto_id not null, precio=0) fall back
      // to the gastos join where precio was stored as per-person share (total/n).
      const precio = row.precio > 0
        ? Number(row.precio)
        : Number(row.gastos?.precio || 0) * n;
      return {
        id: row.id,
        objeto: row.objeto || row.gastos?.objeto || '',
        precio,
        fecha: row.fecha || row.gastos?.fecha || '',
        etiqueta: row.etiqueta || row.gastos?.etiqueta || '',
        pagadoPor: row.pagado_por,
        pagadorNombre: row.pagador?.nombre || row.pagador?.email || row.pagado_por,
        modoSplit: row.modo_split,
        participantes: row.participantes || [],
        createdAt: row.created_at,
      };
    });
  },

  // Split config: { modoSplit: 'solo'|'todos'|'algunos', participanteIds: uuid[] }
  // participanteIds needed only for 'algunos'; for 'todos' pass all participant IDs
  async agregarGasto(viajeId, gastoData, splitConfig, viajeParticipantes) {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) throw new Error('No autenticado');

    const { modoSplit, participanteIds } = splitConfig;

    const participantesIds = modoSplit === 'todos'
      ? viajeParticipantes.map(p => p.userId)
      : modoSplit === 'algunos'
        ? participanteIds
        : [user.id];

    const fechaISO = gastoData.fecha?.includes('/')
      ? gastoData.fecha.split('/').reverse().join('-')
      : (gastoData.fecha || new Date().toISOString().split('T')[0]);

    const { error } = await supabase.from('viaje_gastos').insert([{
      viaje_id: viajeId,
      gasto_id: null,
      objeto: gastoData.objeto,
      precio: Number(gastoData.precio),
      fecha: fechaISO,
      etiqueta: gastoData.etiqueta || null,
      pagado_por: user.id,
      modo_split: modoSplit,
      participantes: participantesIds,
    }]);
    if (error) throw error;

    // Notificaciones push para otros participantes (sin cambios)
    const otherParticipants = (viajeParticipantes || []).filter(p => p.userId !== user.id);
    if (otherParticipants.length > 0) {
      supabase.from('viajes').select('titulo, emoji').eq('id', viajeId).single()
        .then(({ data: viaje }) => {
          if (!viaje) return;
          supabase.from('profiles').select('nombre').eq('id', user.id).single()
            .then(({ data: prof }) => {
              const pagadorName = prof?.nombre || user.email?.split('@')[0] || 'Alguien';
              otherParticipants.forEach(p => {
                sendPushToUser(p.userId, {
                  title: `${viaje.emoji || '💸'} Gasto en ${viaje.titulo}`,
                  body: `${pagadorName} agregó "${gastoData.objeto}" por $${Number(gastoData.precio).toFixed(0)}`,
                  data: { type: 'gasto_creado', viajeId },
                });
              });
            });
        })
        .catch(err => console.warn('[Push] Error sending expense notification:', err.message));
    }
  },

  async eliminarGasto(gastoId) {
    const { error } = await supabase.from('viaje_gastos').delete().eq('id', gastoId);
    if (error) throw error;
  },

  // Returns { porPersona: [{userId, nombre, total, neto}], liquidacion: [{de, deNombre, hacia, haciaNombre, monto}] }
  calcularBalance(viajeGastos, participantes, pagos = []) {
    const nets = {};
    for (const p of participantes) nets[p.userId] = 0;

    for (const g of viajeGastos) {
      if (g.modoSplit === 'solo') continue;

      const ids = g.participantes.length ? g.participantes : participantes.map(p => p.userId);
      const n = ids.length;
      const fullAmount = g.precio; // g.precio es el total pagado (no por-persona)
      const perPersona = fullAmount / n;

      const payerInSplit = ids.includes(g.pagadoPor);
      nets[g.pagadoPor] = (nets[g.pagadoPor] || 0) + fullAmount - (payerInSplit ? perPersona : 0);
      for (const id of ids) {
        if (id !== g.pagadoPor) {
          nets[id] = (nets[id] || 0) - perPersona;
        }
      }
    }

    // Descontar pagos registrados
    for (const p of pagos) {
      nets[p.pagadorId] = (nets[p.pagadorId] || 0) + p.monto;
      nets[p.receptorId] = (nets[p.receptorId] || 0) - p.monto;
    }

    const porPersona = participantes.map(p => ({
      userId: p.userId,
      nombre: p.nombre,
      total: viajeGastos
        .filter(g => g.pagadoPor === p.userId)
        .reduce((sum, g) => sum + g.precio, 0),
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
        de: debtors[di].userId,
        deNombre: debtors[di].nombre,
        hacia: creditors[ci].userId,
        haciaNombre: creditors[ci].nombre,
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
