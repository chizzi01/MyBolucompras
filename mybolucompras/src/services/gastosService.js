import { supabase } from '../lib/supabase';
import { parsePrecio } from '../utils/formatters';

export const gastosService = {
  async getAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('gastos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(mapFromDB);
  },

  async crear(gasto, sharedWith = null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    let finalGasto = { ...gasto };
    if (sharedWith?.mode === 'dividir') {
      finalGasto.precio = parsePrecio(gasto.precio) / 2;
    }
    if (sharedWith?.nombre) {
      finalGasto.compartidoConNombre = sharedWith.nombre;
    }

    const { data, error } = await supabase
      .from('gastos')
      .insert([{ ...mapToDB(finalGasto), user_id: user.id }])
      .select()
      .single();
    if (error) throw error;

    if (sharedWith?.userId) {
      const currentUserName = user.user_metadata?.nombre || user.email;
      const otherGasto = {
        ...finalGasto,
        objeto: `${finalGasto.objeto} (Compartido por ${currentUserName})`,
        compartidoConNombre: currentUserName,
      };
      await supabase.from('gastos').insert([{ ...mapToDB(otherGasto), user_id: sharedWith.userId }]);
      await supabase.from('notifications').insert([{
        user_id: sharedWith.userId,
        title: 'Gasto compartido',
        message: `${currentUserName} te compartió un gasto: ${gasto.objeto}`,
        data: { gasto_id: data.id },
      }]);
    }

    return mapFromDB(data);
  },

  async actualizar(id, gasto, sharedWith = null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    let finalGasto = { ...gasto };
    if (sharedWith?.mode === 'dividir') {
      finalGasto.precio = parsePrecio(gasto.precio) / 2;
    }
    if (sharedWith?.nombre) {
      finalGasto.compartidoConNombre = sharedWith.nombre;
    }

    const { data, error } = await supabase
      .from('gastos')
      .update(mapToDB(finalGasto))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    if (sharedWith?.userId) {
      const currentUserName = user.user_metadata?.nombre || user.email;
      const otherGasto = {
        ...finalGasto,
        objeto: `${finalGasto.objeto} (Compartido por ${currentUserName})`,
        compartidoConNombre: currentUserName,
      };
      await supabase.from('gastos').insert([{ ...mapToDB(otherGasto), user_id: sharedWith.userId }]);
      await supabase.from('notifications').insert([{
        user_id: sharedWith.userId,
        title: 'Gasto compartido',
        message: `${currentUserName} te compartió un gasto: ${gasto.objeto}`,
        data: { gasto_id: data.id },
      }]);
    }

    return mapFromDB(data);
  },

  async eliminar(id) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');
    const { error } = await supabase.from('gastos').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;
  },

  async actualizarEtiqueta(id, etiqueta) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');
    const { data, error } = await supabase
      .from('gastos')
      .update({ etiqueta })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) throw error;
    return mapFromDB(data);
  },

  async quitarEtiquetaDeTodos(nombreEtiqueta) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');
    const { error } = await supabase
      .from('gastos')
      .update({ etiqueta: null })
      .eq('etiqueta', nombreEtiqueta)
      .eq('user_id', user.id);
    if (error) throw error;
  },
};

// Convierte el formato DB (snake_case, fecha ISO) al formato legacy de la app (DD/MM/YYYY, precio con $)
function mapFromDB(row) {
  return {
    id: row.id,
    isFijo: row.es_fijo,
    objeto: row.objeto,
    fecha: row.fecha ? row.fecha.split('-').reverse().join('/') : '',
    medio: row.medio,
    cuotas: row.cuotas,
    tipo: row.tipo,
    moneda: row.moneda,
    banco: row.banco || '',
    cantidad: row.cantidad,
    precio: `$ ${Number(row.precio).toFixed(2)}`,
    etiqueta: row.etiqueta || '',
    compartidoConNombre: row.compartido_con_nombre || null,
  };
}

// Convierte el formato legacy de la app al formato DB
function mapToDB(gasto) {
  const precioNumerico = parsePrecio(gasto.precio);

  // Fecha puede venir como DD/MM/YYYY o YYYY-MM-DD
  let fechaISO = gasto.fecha;
  if (gasto.fecha && gasto.fecha.includes('/')) {
    fechaISO = gasto.fecha.split('/').reverse().join('-');
  }

  return {
    es_fijo: gasto.isFijo ?? false,
    objeto: gasto.objeto,
    fecha: fechaISO,
    medio: gasto.medio,
    cuotas: gasto.cuotas ?? 1,
    tipo: gasto.tipo || null,
    moneda: gasto.moneda || 'ARS',
    banco: gasto.banco || null,
    cantidad: gasto.cantidad ?? 1,
    precio: isNaN(precioNumerico) ? 0 : precioNumerico,
    etiqueta: gasto.etiqueta || null,
    compartido_con_nombre: gasto.compartidoConNombre || null,
  };
}
