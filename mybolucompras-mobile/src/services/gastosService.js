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

  async crear(gasto, sharedWith = null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    let finalGasto = { ...gasto };
    
    // If dividing, reduce original price
    if (sharedWith && sharedWith.mode === 'dividir') {
      finalGasto.precio = gasto.precio / 2;
    }

    if (sharedWith && sharedWith.nombre) {
      finalGasto.compartidoConNombre = sharedWith.nombre;
    }

    const { data, error } = await supabase
      .from('gastos')
      .insert([{ ...mapToDB(finalGasto), user_id: user.id }])
      .select()
      .single();
    
    if (error) throw error;

    if (sharedWith && sharedWith.userId) {
      // Create expense for the other user
      const otherGasto = { 
        ...finalGasto, 
        objeto: `${finalGasto.objeto} (Compartido por ${user.user_metadata?.nombre || user.email})`,
        compartidoConNombre: user.user_metadata?.nombre || user.email
      };
      
      await supabase
        .from('gastos')
        .insert([{ ...mapToDB(otherGasto), user_id: sharedWith.userId }]);
      
      // Create notification
      await supabase
        .from('notifications')
        .insert([{
          user_id: sharedWith.userId,
          title: 'Gasto compartido',
          message: `${user.user_metadata?.nombre || user.email} te compartió un gasto: ${gasto.objeto}`,
          data: { gasto_id: data.id }
        }]);
    }

    return mapFromDB(data);
  },

  async actualizar(id, gasto, sharedWith = null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    let finalGasto = { ...gasto };
    
    if (sharedWith && sharedWith.mode === 'dividir') {
      finalGasto.precio = gasto.precio / 2;
    }

    if (sharedWith && sharedWith.nombre) {
      finalGasto.compartidoConNombre = sharedWith.nombre;
    }

    const { data, error } = await supabase
      .from('gastos')
      .update(mapToDB(finalGasto))
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;

    if (sharedWith && sharedWith.userId) {
      const otherGasto = { 
        ...finalGasto, 
        objeto: `${finalGasto.objeto} (Compartido por ${user.user_metadata?.nombre || user.email})`,
        compartidoConNombre: user.user_metadata?.nombre || user.email
      };
      
      await supabase
        .from('gastos')
        .insert([{ ...mapToDB(otherGasto), user_id: sharedWith.userId }]);
      
      await supabase
        .from('notifications')
        .insert([{
          user_id: sharedWith.userId,
          title: 'Gasto compartido',
          message: `${user.user_metadata?.nombre || user.email} te compartió un gasto: ${gasto.objeto}`,
          data: { gasto_id: data.id }
        }]);
    }

    return mapFromDB(data);
  },

  async eliminar(id) {
    const { error } = await supabase.from('gastos').delete().eq('id', id);
    if (error) throw error;
  },
};

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
    precioNum: Number(row.precio),
    etiqueta: row.etiqueta || '',
    compartidoConNombre: row.compartido_con_nombre || null,
  };
}

function mapToDB(gasto) {
  const precioNumerico = parsePrecio(gasto.precio);
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
