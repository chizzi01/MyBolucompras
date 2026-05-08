import { supabase } from '../lib/supabase';

// Etiquetas se almacenan como JSONB en configuracion_usuario.etiquetas
export const etiquetasService = {
  async agregar(configActual, nuevaEtiqueta) {
    const { data: { user } } = await supabase.auth.getUser();
    const etiquetasActualizadas = [
      ...(configActual.etiquetas || []),
      { nombre: nuevaEtiqueta.nombre, color: nuevaEtiqueta.color || '#000000' },
    ];
    const { error } = await supabase
      .from('configuracion_usuario')
      .update({ etiquetas: etiquetasActualizadas, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);
    if (error) throw error;
    return etiquetasActualizadas;
  },

  async eliminar(configActual, nombreEtiqueta) {
    const { data: { user } } = await supabase.auth.getUser();
    const etiquetasActualizadas = (configActual.etiquetas || []).filter(
      e => e.nombre !== nombreEtiqueta
    );
    const presupuestosActualizados = { ...(configActual.presupuestos || {}) };
    delete presupuestosActualizados[nombreEtiqueta];

    const { error } = await supabase
      .from('configuracion_usuario')
      .update({
        etiquetas: etiquetasActualizadas,
        presupuestos: presupuestosActualizados,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);
    if (error) throw error;
    return { etiquetas: etiquetasActualizadas, presupuestos: presupuestosActualizados };
  },
};
