// Script de migración: importa data.json y misdatos.json a Supabase
// Uso: node migrate.js <email> <password>

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hmlcgwptszhqknyrmarf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fitU_eDmpPKuedxVhjW1BA_9ea9AumD';

const rawGastos = require('./data.json');
const misdatos = require('./misdatos.json');

// Corrige el problema de encoding: "MamÃ¡" → "Mamá"
function fixEncoding(str) {
  if (typeof str !== 'string' || str === '') return str;
  try {
    return decodeURIComponent(escape(str));
  } catch {
    return str;
  }
}

function parsePrecio(valor) {
  if (typeof valor === 'number') return isNaN(valor) ? 0 : valor;
  if (!valor) return 0;
  const limpio = String(valor).replace(/\$|\s/g, '').trim();
  if (/^\d+(\.\d+)?$/.test(limpio)) return Number(limpio);
  return Number(limpio.replace(/\./g, '').replace(',', '.')) || 0;
}

function mapGasto(g) {
  let fechaISO = g.fecha;
  if (g.fecha && g.fecha.includes('/')) {
    const [d, m, y] = g.fecha.split('/');
    fechaISO = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return {
    es_fijo: g.isFijo ?? false,
    objeto: fixEncoding(g.objeto),
    fecha: fechaISO,
    medio: g.medio,
    cuotas: parseInt(g.cuotas) || 1,
    tipo: g.tipo || null,
    moneda: g.moneda || 'ARS',
    banco: g.banco || null,
    cantidad: parseInt(g.cantidad) || 1,
    precio: parsePrecio(g.precio),
    etiqueta: fixEncoding(g.etiqueta) || null,
  };
}

async function main() {
  const [, , email, password] = process.argv;
  if (!email || !password) {
    console.error('Uso: node migrate.js <email> <password>');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('Autenticando...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) {
    console.error('Error de autenticación:', authError.message);
    process.exit(1);
  }
  console.log('Autenticado como:', authData.user.email);

  const userId = authData.user.id;

  // Migrar gastos
  console.log(`\nMigrando ${rawGastos.length} gastos...`);
  const gastos = rawGastos.map(g => ({ ...mapGasto(g), user_id: userId }));

  const CHUNK = 50;
  for (let i = 0; i < gastos.length; i += CHUNK) {
    const chunk = gastos.slice(i, i + CHUNK);
    const { error } = await supabase.from('gastos').insert(chunk);
    if (error) {
      console.error('Error insertando gastos:', error.message);
      process.exit(1);
    }
    console.log(`  ${Math.min(i + CHUNK, gastos.length)}/${gastos.length} gastos insertados`);
  }
  console.log('Gastos migrados correctamente.');

  // Migrar configuración
  console.log('\nMigrando configuración...');

  const etiquetas = misdatos.etiquetas.map(e => ({
    ...e,
    nombre: fixEncoding(e.nombre),
  }));

  const presupuestos = {};
  for (const [key, value] of Object.entries(misdatos.presupuestos)) {
    presupuestos[fixEncoding(key)] = value;
  }

  const config = {
    user_id: authData.user.id,
    cierre: misdatos.cierre,
    vencimiento: misdatos.vencimiento,
    cierre_anterior: misdatos.cierreAnterior,
    vencimiento_anterior: misdatos.vencimientoAnterior,
    fondos: misdatos.fondos,
    etiquetas,
    presupuestos,
  };

  const { error: configError } = await supabase
    .from('configuracion_usuario')
    .upsert(config, { onConflict: 'user_id' });

  if (configError) {
    console.error('Error guardando configuración:', configError.message);
    process.exit(1);
  }
  console.log('Configuración migrada correctamente.');
  console.log('\nMigración completada exitosamente.');
  console.log(`  - ${rawGastos.length} gastos importados`);
  console.log(`  - ${etiquetas.length} etiquetas configuradas`);
  console.log(`  - Fondos: $${misdatos.fondos.toLocaleString('es-AR')}`);
}

main().catch(console.error);
