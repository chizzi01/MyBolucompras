// src/services/viajeGastosService.js
import { supabase } from '../lib/supabase';
import { gastosService } from './gastosService';

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
    return data.map(row => ({
      id: row.id,
      gastoId: row.gasto_id,
      objeto: row.gastos?.objeto || '',
      precio: Number(row.gastos?.precio || 0),
      fecha: row.gastos?.fecha || '',
      etiqueta: row.gastos?.etiqueta || '',
      pagadoPor: row.pagado_por,
      pagadorNombre: row.pagador?.nombre || row.pagador?.email || row.pagado_por,
      modoSplit: row.modo_split,
      participantes: row.participantes || [],
      createdAt: row.created_at,
    }));
  },

  // Split config: { modoSplit: 'solo'|'todos'|'algunos', participanteIds: uuid[] }
  // participanteIds needed only for 'algunos'; for 'todos' pass all participant IDs
  async agregarGasto(viajeId, gastoData, splitConfig, viajeParticipantes) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { modoSplit, participanteIds } = splitConfig;

    let precioBase = Number(gastoData.precio);
    let copias = [];

    if (modoSplit === 'todos') {
      const n = viajeParticipantes.length;
      precioBase = Number(gastoData.precio) / n;
      copias = viajeParticipantes
        .filter(p => p.userId !== user.id)
        .map(p => ({ ...gastoData, precio: precioBase, compartidoConNombre: gastoData.objeto }));
    } else if (modoSplit === 'algunos') {
      const n = participanteIds.length;
      precioBase = Number(gastoData.precio) / n;
      copias = participanteIds
        .filter(id => id !== user.id)
        .map(uid => {
          const p = viajeParticipantes.find(p => p.userId === uid);
          return { ...gastoData, precio: precioBase, compartidoConNombre: gastoData.objeto, _userId: uid };
        });
    }

    // Create main gasto for payer
    const mainGasto = await gastosService.crear({ ...gastoData, precio: precioBase });

    // Create copies for other participants
    for (const copia of copias) {
      const uid = copia._userId;
      const { _userId, ...copiaData } = copia;
      await supabase.from('gastos').insert([{
        es_fijo: copiaData.isFijo ?? false,
        objeto: `${copiaData.objeto} (viaje: ${copiaData.compartidoConNombre})`,
        fecha: copiaData.fecha?.includes('/') ? copiaData.fecha.split('/').reverse().join('-') : copiaData.fecha,
        medio: copiaData.medio,
        cuotas: copiaData.cuotas ?? 1,
        tipo: copiaData.tipo || null,
        moneda: copiaData.moneda || 'ARS',
        banco: copiaData.banco || null,
        cantidad: 1,
        precio: copiaData.precio,
        etiqueta: copiaData.etiqueta || null,
        compartido_con_nombre: copiaData.compartidoConNombre,
        user_id: uid,
      }]);
    }

    // Register in viaje_gastos
    const participantesIds = modoSplit === 'todos'
      ? viajeParticipantes.map(p => p.userId)
      : modoSplit === 'algunos'
        ? participanteIds
        : [user.id];

    const { error } = await supabase.from('viaje_gastos').insert([{
      viaje_id: viajeId,
      gasto_id: mainGasto.id,
      pagado_por: user.id,
      modo_split: modoSplit,
      participantes: participantesIds,
    }]);
    if (error) throw error;

    return mainGasto;
  },

  // Returns { porPersona: [{userId, nombre, total, neto}], liquidacion: [{de, deNombre, hacia, haciaNombre, monto}] }
  calcularBalance(viajeGastos, participantes) {
    // Initialize nets to 0
    const nets = {};
    for (const p of participantes) nets[p.userId] = 0;

    for (const g of viajeGastos) {
      if (g.modoSplit === 'solo') continue;

      const ids = g.participantes.length ? g.participantes : participantes.map(p => p.userId);
      const n = ids.length;
      const porPersona = g.precio / n;

      // Payer receives money from others (excluding his own share)
      nets[g.pagadoPor] = (nets[g.pagadoPor] || 0) + g.precio - porPersona;

      // Others owe their share
      for (const id of ids) {
        if (id !== g.pagadoPor) {
          nets[id] = (nets[id] || 0) - porPersona;
        }
      }
    }

    // Build per-person summary
    const porPersona = participantes.map(p => ({
      userId: p.userId,
      nombre: p.nombre,
      total: viajeGastos
        .filter(g => g.pagadoPor === p.userId)
        .reduce((sum, g) => sum + g.precio, 0),
      neto: nets[p.userId] || 0,
    }));

    // Greedy liquidation: highest creditor collects from highest debtor first
    const creditors = porPersona.filter(p => p.neto > 0.01).map(p => ({ ...p }));
    const debtors   = porPersona.filter(p => p.neto < -0.01).map(p => ({ ...p }));
    creditors.sort((a, b) => b.neto - a.neto);
    debtors.sort((a, b) => a.neto - b.neto);

    const liquidacion = [];
    let ci = 0, di = 0;
    while (ci < creditors.length && di < debtors.length) {
      const amount = Math.min(creditors[ci].neto, -debtors[di].neto);
      liquidacion.push({ de: debtors[di].userId, deNombre: debtors[di].nombre, hacia: creditors[ci].userId, haciaNombre: creditors[ci].nombre, monto: Math.round(amount * 100) / 100 });
      creditors[ci].neto -= amount;
      debtors[di].neto  += amount;
      if (creditors[ci].neto < 0.01) ci++;
      if (-debtors[di].neto  < 0.01) di++;
    }

    return { porPersona, liquidacion };
  },
};
