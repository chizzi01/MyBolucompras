import { supabase } from '../lib/supabase';
import { parsePrecio } from '../utils/formatters';

export const gastosService = {
  async getAll() {
    const { data, error } = await supabase
      .from('gastos')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(mapFromDB);
  },

  async crear(gasto) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');
    const { data, error } = await supabase
      .from('gastos')
      .insert([{ ...mapToDB(gasto), user_id: user.id }])
      .select()
      .single();
    if (error) throw error;
    return mapFromDB(data);
  },

  async actualizar(id, gasto) {
    const { data, error } = await supabase
      .from('gastos')
      .update(mapToDB(gasto))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapFromDB(data);
  },

  async eliminar(id) {
    const { error } = await supabase.from('gastos').delete().eq('id', id);
    if (error) throw error;
  },

  async actualizarEtiqueta(id, etiqueta) {
    const { data, error } = await supabase
      .from('gastos')
      .update({ etiqueta })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapFromDB(data);
  },

  async quitarEtiquetaDeTodos(nombreEtiqueta) {
    const { error } = await supabase
      .from('gastos')
      .update({ etiqueta: null })
      .eq('etiqueta', nombreEtiqueta);
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
  };
}
