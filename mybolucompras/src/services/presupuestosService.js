import { supabase } from '../lib/supabase';

// Presupuestos se almacenan como JSONB en configuracion_usuario.presupuestos
export const presupuestosService = {
  async actualizar(configActual, etiqueta, monto, visible = true) {
    const { data: { user } } = await supabase.auth.getUser();
    const presupuestosActualizados = {
      ...(configActual.presupuestos || {}),
      [etiqueta]: { monto: Number(monto), visible },
    };
    const { error } = await supabase
      .from('configuracion_usuario')
      .update({ presupuestos: presupuestosActualizados, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);
    if (error) throw error;
    return presupuestosActualizados;
  },

  async toggleVisibilidad(configActual, etiqueta) {
    const { data: { user } } = await supabase.auth.getUser();
    const actual = configActual.presupuestos?.[etiqueta] || {};
    const presupuestosActualizados = {
      ...(configActual.presupuestos || {}),
      [etiqueta]: { ...actual, visible: !actual.visible },
    };
    const { error } = await supabase
      .from('configuracion_usuario')
      .update({ presupuestos: presupuestosActualizados, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);
    if (error) throw error;
    return presupuestosActualizados;
  },
};
