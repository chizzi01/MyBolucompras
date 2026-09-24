import { supabase } from '../lib/supabase';

export const configuracionService = {
  async get() {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) return null;
    const { data, error } = await supabase
      .from('configuracion_usuario')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapFromDB(data) : getDefaults();
  },

  async actualizar(patch) {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) throw new Error('No autenticado');
    const { error } = await supabase
      .from('configuracion_usuario')
      .upsert({ user_id: user.id, ...mapToDB(patch), updated_at: new Date().toISOString() });
    if (error) throw error;
  },
};

function getDefaults() {
  return {
    cierre: '', vencimiento: '',
    cierreAnterior: '', vencimientoAnterior: '',
    fondos: 0, etiquetas: [], presupuestos: {},
    presupuestoMensualMax: 0, bancosHabilitados: [],
    mediosHabilitados: [], monedaPreferida: 'ARS',
    modoViajeActivo: false, modoViajeViajeId: null, modoViajePromptedIds: [],
  };
}

function mapFromDB(row) {
  return {
    cierre: row.cierre || '',
    vencimiento: row.vencimiento || '',
    cierreAnterior: row.cierre_anterior || '',
    vencimientoAnterior: row.vencimiento_anterior || '',
    fondos: Number(row.fondos) || 0,
    etiquetas: (row.etiquetas || []).map(e => typeof e === 'string' ? { nombre: e, color: '#6366F1' } : e).filter(e => e?.nombre),
    presupuestos: row.presupuestos || {},
    presupuestoMensualMax: Number(row.presupuesto_mensual_max) || 0,
    bancosHabilitados: row.bancos_habilitados || [],
    mediosHabilitados: row.medios_habilitados || [],
    monedaPreferida: row.moneda_preferida || 'ARS',
    modoViajeActivo: row.modo_viaje_activo ?? false,
    modoViajeViajeId: row.modo_viaje_viaje_id ?? null,
    modoViajePromptedIds: row.modo_viaje_prompted_ids ?? [],
  };
}

// Solo mapea los campos presentes en el patch: el upsert únicamente pisa
// esas columnas, así un guardado parcial nunca borra el resto de la config.
const DB_FIELDS = {
  cierre: ['cierre', v => v || null],
  vencimiento: ['vencimiento', v => v || null],
  cierreAnterior: ['cierre_anterior', v => v || null],
  vencimientoAnterior: ['vencimiento_anterior', v => v || null],
  fondos: ['fondos', v => Number(v) || 0],
  etiquetas: ['etiquetas', v => v || []],
  presupuestos: ['presupuestos', v => v || {}],
  presupuestoMensualMax: ['presupuesto_mensual_max', v => Number(v) || 0],
  bancosHabilitados: ['bancos_habilitados', v => v || []],
  mediosHabilitados: ['medios_habilitados', v => v || []],
  monedaPreferida: ['moneda_preferida', v => v || 'ARS'],
  modoViajeActivo: ['modo_viaje_activo', v => !!v],
  modoViajeViajeId: ['modo_viaje_viaje_id', v => v ?? null],
  modoViajePromptedIds: ['modo_viaje_prompted_ids', v => v ?? []],
};

function mapToDB(patch) {
  const row = {};
  for (const [key, [column, convert]] of Object.entries(DB_FIELDS)) {
    if (key in patch) row[column] = convert(patch[key]);
  }
  return row;
}
