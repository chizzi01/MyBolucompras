jest.mock('../parseIA');
const { parseConIA } = require('../parseIA');
const { parsearNotificacion } = require('../parser');

describe('parsearNotificacion', () => {
  afterEach(() => jest.clearAllMocks());

  test('descarta notificaciones que no son de compra sin llamar a la IA', async () => {
    const resultado = await parsearNotificacion({
      titulo: '¡Recibiste plata!',
      texto: 'te envió $50.000',
      apiKey: 'fake',
    });
    expect(resultado).toBeNull();
    expect(parseConIA).not.toHaveBeenCalled();
  });

  test('usa la plantilla de Galicia cuando matchea, sin llamar a la IA', async () => {
    const resultado = await parsearNotificacion({
      titulo: 'Pagaste: $12.000',
      texto: 'A MANTECA LB-MANTECA LB HE con tu Visa Débito 2665 a las 14:35',
      apiKey: 'fake',
    });
    expect(resultado).toMatchObject({ monto: 12000, banco: 'Galicia', fuente: 'regla' });
    expect(parseConIA).not.toHaveBeenCalled();
  });

  test('cae al fallback de IA cuando ninguna plantilla matchea', async () => {
    parseConIA.mockResolvedValue({
      monto: 2450, moneda: 'ARS', comercio_raw: 'COTO', medio: 'Visa', tipo: 'credito', ultimos4: '4821',
    });
    const resultado = await parsearNotificacion({
      titulo: 'Compraste $2.450 en COTO',
      texto: 'con tu tarjeta',
      apiKey: 'fake',
    });
    expect(resultado).toMatchObject({ monto: 2450, banco: null, fuente: 'ia' });
    expect(parseConIA).toHaveBeenCalledTimes(1);
  });

  test('sin apiKey y sin plantilla, no llama a la IA y devuelve null', async () => {
    const resultado = await parsearNotificacion({
      titulo: 'Compraste $2.450 en COTO',
      texto: 'con tu tarjeta',
      apiKey: null,
    });
    expect(resultado).toBeNull();
    expect(parseConIA).not.toHaveBeenCalled();
  });
});
