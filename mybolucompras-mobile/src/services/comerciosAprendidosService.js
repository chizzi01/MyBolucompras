import { supabase } from '../lib/supabase';

export const comerciosAprendidosService = {
  async buscar(comercioRaw) {
    if (!comercioRaw) return null;
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) return null;

    const { data, error } = await supabase
      .from('comercios_aprendidos')
      .select('etiqueta, medio_pago')
      .eq('user_id', user.id)
      .eq('comercio_raw', comercioRaw)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { etiqueta: data.etiqueta || null, medioPago: data.medio_pago || null };
  },

  async guardar(comercioRaw, { etiqueta, medioPago }) {
    if (!comercioRaw) return;
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) throw new Error('No autenticado');

    const { error } = await supabase
      .from('comercios_aprendidos')
      .upsert({
        user_id: user.id,
        comercio_raw: comercioRaw,
        etiqueta: etiqueta || null,
        medio_pago: medioPago || null,
      });
    if (error) throw error;
  },
};
