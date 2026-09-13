jest.mock('../notificationListenerBridge', () => ({
  notificationListenerBridge: { leerYVaciarCola: jest.fn() },
}));
jest.mock('../notificaciones/parser', () => ({ parsearNotificacion: jest.fn() }));
jest.mock('../notificacionesPendientesService', () => ({
  notificacionesPendientesService: {
    getRecientes: jest.fn(),
    crear: jest.fn(),
  },
}));

const { notificationListenerBridge } = require('../notificationListenerBridge');
const { parsearNotificacion } = require('../notificaciones/parser');
const { notificacionesPendientesService } = require('../notificacionesPendientesService');
const { procesarColaDeNotificaciones } = require('../notificacionesQueueProcessor');

describe('procesarColaDeNotificaciones', () => {
  afterEach(() => jest.clearAllMocks());

  test('crea una fila pendiente por cada notificación parseable y no duplicada', async () => {
    notificationListenerBridge.leerYVaciarCola.mockResolvedValue([
      { packageName: 'com.bancogalicia.appandroid', titulo: 'Pagaste: $12.000', texto: 'A COTO con tu Visa Débito 1234', timestamp: '2026-09-12T14:36:00Z' },
    ]);
    notificacionesPendientesService.getRecientes.mockResolvedValue([]);
    parsearNotificacion.mockResolvedValue({
      monto: 12000, moneda: 'ARS', comercio_raw: 'COTO', medio: 'Visa', tipo: 'debito', ultimos4: '1234', banco: 'Galicia', fuente: 'regla',
    });

    const creadas = await procesarColaDeNotificaciones({ apiKey: 'fake' });

    expect(creadas).toBe(1);
    expect(notificacionesPendientesService.crear).toHaveBeenCalledWith(expect.objectContaining({
      banco: 'Galicia', bancoPackage: 'com.bancogalicia.appandroid', monto: 12000,
      fechaDetectada: '2026-09-12T14:36:00Z', textoRaw: 'Pagaste: $12.000\nA COTO con tu Visa Débito 1234',
    }));
  });

  test('no crea nada si el parser descarta la notificación', async () => {
    notificationListenerBridge.leerYVaciarCola.mockResolvedValue([
      { packageName: 'com.whatsapp', titulo: 'Juan', texto: 'Hola!', timestamp: '2026-09-12T14:36:00Z' },
    ]);
    notificacionesPendientesService.getRecientes.mockResolvedValue([]);
    parsearNotificacion.mockResolvedValue(null);

    const creadas = await procesarColaDeNotificaciones({ apiKey: 'fake' });

    expect(creadas).toBe(0);
    expect(notificacionesPendientesService.crear).not.toHaveBeenCalled();
  });

  test('no crea nada si es duplicado de una reciente', async () => {
    notificationListenerBridge.leerYVaciarCola.mockResolvedValue([
      { packageName: 'com.bancogalicia.appandroid', titulo: 'Pagaste: $12.000', texto: 'A COTO con tu Visa Débito 1234', timestamp: '2026-09-12T14:36:00Z' },
    ]);
    notificacionesPendientesService.getRecientes.mockResolvedValue([
      { monto: 12000, ultimos4: '1234', fecha_detectada: '2026-09-12T14:35:30Z', estado: 'confirmado' },
    ]);
    parsearNotificacion.mockResolvedValue({
      monto: 12000, moneda: 'ARS', comercio_raw: 'COTO', medio: 'Visa', tipo: 'debito', ultimos4: '1234', banco: 'Galicia', fuente: 'regla',
    });

    const creadas = await procesarColaDeNotificaciones({ apiKey: 'fake' });

    expect(creadas).toBe(0);
    expect(notificacionesPendientesService.crear).not.toHaveBeenCalled();
  });

  test('si una entrada falla al procesarse, sigue procesando el resto del batch', async () => {
    notificationListenerBridge.leerYVaciarCola.mockResolvedValue([
      { packageName: 'com.bancogalicia.appandroid', titulo: 'rota', texto: 'rota', timestamp: '2026-09-12T14:36:00Z' },
      { packageName: 'com.bancogalicia.appandroid', titulo: 'Pagaste: $12.000', texto: 'A COTO con tu Visa Débito 1234', timestamp: '2026-09-12T14:37:00Z' },
    ]);
    notificacionesPendientesService.getRecientes.mockResolvedValue([]);
    parsearNotificacion
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({
        monto: 12000, moneda: 'ARS', comercio_raw: 'COTO', medio: 'Visa', tipo: 'debito', ultimos4: '1234', banco: 'Galicia', fuente: 'regla',
      });
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const creadas = await procesarColaDeNotificaciones({ apiKey: 'fake' });

    expect(creadas).toBe(1);
    expect(notificacionesPendientesService.crear).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      '[notificacionesQueueProcessor] error al procesar una notificación:',
      'boom'
    );

    console.warn.mockRestore();
  });
});
