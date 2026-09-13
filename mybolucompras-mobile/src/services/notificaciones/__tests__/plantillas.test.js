const { PLANTILLAS, parseMontoBancario } = require('../plantillas');

describe('parseMontoBancario', () => {
  test('miles con punto, sin decimales', () => {
    expect(parseMontoBancario('12.000')).toBe(12000);
  });
  test('miles con punto y decimales con coma', () => {
    expect(parseMontoBancario('1.234,56')).toBe(1234.56);
  });
  test('sin separadores', () => {
    expect(parseMontoBancario('500')).toBe(500);
  });
});

describe('plantilla Galicia', () => {
  const galicia = PLANTILLAS.find((p) => p.banco === 'Galicia');

  test('extrae los datos de la notificación real', () => {
    const resultado = galicia.extraer(
      'Pagaste: $12.000',
      'A MANTECA LB-MANTECA LB HE con tu Visa Débito 2665 a las 14:35',
    );
    expect(resultado).toEqual({
      monto: 12000,
      moneda: 'ARS',
      comercio_raw: 'MANTECA LB-MANTECA LB HE',
      medio: 'Visa',
      tipo: 'debito',
      ultimos4: '2665',
    });
  });

  test('devuelve null si el título no matchea', () => {
    expect(galicia.extraer('Notificación', 'algo')).toBeNull();
  });

  test('reconoce tarjeta de crédito', () => {
    const resultado = galicia.extraer(
      'Pagaste: $3.500',
      'A FARMACIA DEL SUR con tu Mastercard Crédito 7788 a las 09:10',
    );
    expect(resultado.tipo).toBe('credito');
    expect(resultado.medio).toBe('Mastercard');
    expect(resultado.ultimos4).toBe('7788');
  });
});
