const { parseConIA } = require('../parseIA');

describe('parseConIA', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('parsea la respuesta del modelo cuando es una compra', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              monto: '2450.00',
              comercio_raw: 'COTO CICSA',
              medio: 'Visa',
              tipo: 'credito',
              ultimos4: '4821',
              moneda: 'ARS',
            }),
          },
        }],
      }),
    });

    const resultado = await parseConIA('Compraste', 'texto de un banco sin plantilla', 'fake-key');

    expect(resultado).toEqual({
      monto: 2450,
      moneda: 'ARS',
      comercio_raw: 'COTO CICSA',
      medio: 'Visa',
      tipo: 'credito',
      ultimos4: '4821',
    });
  });

  test('devuelve null si el modelo dice que no es una compra', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"esCompra": false}' } }],
      }),
    });

    const resultado = await parseConIA('Hola', 'no es un pago', 'fake-key');
    expect(resultado).toBeNull();
  });

  test('devuelve null si la respuesta HTTP falla', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    const resultado = await parseConIA('x', 'y', 'fake-key');
    expect(resultado).toBeNull();
  });

  test('devuelve null si fetch rechaza (error de red)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
    const resultado = await parseConIA('x', 'y', 'fake-key');
    expect(resultado).toBeNull();
  });

  test('devuelve null si response.json() rechaza (respuesta no JSON)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockRejectedValue(new Error('invalid json')),
    });
    const resultado = await parseConIA('x', 'y', 'fake-key');
    expect(resultado).toBeNull();
  });
});
