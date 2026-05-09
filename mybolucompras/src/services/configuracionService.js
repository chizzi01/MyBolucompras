import { supabase } from '../lib/supabase';

export const configuracionService = {
  async get() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('configuracion_usuario')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapFromDB(data) : getDefaults();
  },

  async actualizar(config) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { error } = await supabase
      .from('configuracion_usuario')
      .upsert({ user_id: user.id, ...mapToDB(config), updated_at: new Date().toISOString() });
    if (error) throw error;
  },
};

function getDefaults() {
  return {
    cierre: '',
    vencimiento: '',
    cierreAnterior: '',
    vencimientoAnterior: '',
    fondos: 0,
    etiquetas: [],
    presupuestos: {},
    presupuestoMensualMax: 0,
  };
}

function mapFromDB(row) {
  return {
    cierre: row.cierre || '',
    vencimiento: row.vencimiento || '',
    cierreAnterior: row.cierre_anterior || '',
    vencimientoAnterior: row.vencimiento_anterior || '',
    fondos: Number(row.fondos) || 0,
    etiquetas: row.etiquetas || [],
    presupuestos: row.presupuestos || {},
    presupuestoMensualMax: Number(row.presupuesto_mensual_max) || 0,
  };
}

function mapToDB(config) {
  return {
    cierre: config.cierre || null,
    vencimiento: config.vencimiento || null,
    cierre_anterior: config.cierreAnterior || null,
    vencimiento_anterior: config.vencimientoAnterior || null,
    fondos: Number(config.fondos) || 0,
    etiquetas: config.etiquetas || [],
    presupuestos: config.presupuestos || {},
    presupuesto_mensual_max: Number(config.presupuestoMensualMax) || 0,
  };
}
