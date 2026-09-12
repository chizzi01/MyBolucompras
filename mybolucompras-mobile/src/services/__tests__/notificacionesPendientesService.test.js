// El service real importa ../lib/supabase, que a su vez importa 'react-native'
// y 'expo-constants' — no cargan bajo Jest plano (sin jest-expo). Se mockea
// el módulo antes de requerir el service para poder testear solo el mapeo.
jest.mock('../../lib/supabase', () => ({ supabase: {} }));

const { mapFromDB, mapToDB } = require('../notificacionesPendientesService');

describe('notificacionesPendientesService mapping', () => {
  test('mapFromDB convierte snake_case a camelCase', () => {
    const row = {
      id: 'abc', banco: 'Galicia', banco_package: 'com.bancogalicia.appandroid',
      texto_raw: 'A COTO con tu Visa Débito 1234', monto: 12000, moneda: 'ARS',
      comercio_raw: 'COTO', ultimos4: '1234', medio: 'Visa', tipo: 'debito',
      fuente: 'regla', fecha_detectada: '2026-09-12T14:36:00Z', estado: 'pendiente',
      gasto_id: null, created_at: '2026-09-12T14:36:05Z',
    };
    expect(mapFromDB(row)).toEqual({
      id: 'abc', banco: 'Galicia', bancoPackage: 'com.bancogalicia.appandroid',
      textoRaw: 'A COTO con tu Visa Débito 1234', monto: 12000, moneda: 'ARS',
      comercioRaw: 'COTO', ultimos4: '1234', medio: 'Visa', tipo: 'debito',
      fuente: 'regla', fechaDetectada: '2026-09-12T14:36:00Z', estado: 'pendiente',
      gastoId: null, createdAt: '2026-09-12T14:36:05Z',
    });
  });

  test('mapToDB convierte camelCase a snake_case', () => {
    const datos = {
      banco: 'Galicia', bancoPackage: 'com.bancogalicia.appandroid',
      textoRaw: 'A COTO con tu Visa Débito 1234', monto: 12000, moneda: 'ARS',
      comercioRaw: 'COTO', ultimos4: '1234', medio: 'Visa', tipo: 'debito',
      fuente: 'regla', fechaDetectada: '2026-09-12T14:36:00Z',
    };
    expect(mapToDB(datos)).toEqual({
      banco: 'Galicia', banco_package: 'com.bancogalicia.appandroid',
      texto_raw: 'A COTO con tu Visa Débito 1234', monto: 12000, moneda: 'ARS',
      comercio_raw: 'COTO', ultimos4: '1234', medio: 'Visa', tipo: 'debito',
      fuente: 'regla', fecha_detectada: '2026-09-12T14:36:00Z',
    });
  });
});
