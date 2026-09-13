const { esNotificacionDeCompra } = require('../filtro');

describe('esNotificacionDeCompra', () => {
  test('acepta una notificación real de compra de Galicia', () => {
    expect(esNotificacionDeCompra({
      titulo: 'Pagaste: $12.000',
      texto: 'A MANTECA LB-MANTECA LB HE con tu Visa Débito 2665 a las 14:35',
    })).toBe(true);
  });

  test('rechaza una notificación de transferencia recibida', () => {
    expect(esNotificacionDeCompra({
      titulo: '¡Recibiste plata! 💰🤑',
      texto: 'Agustin Chizzini Melo te envió: $50.000',
    })).toBe(false);
  });

  test('rechaza texto sin monto', () => {
    expect(esNotificacionDeCompra({
      titulo: 'Nuevo mensaje',
      texto: 'Tenés una notificación pendiente',
    })).toBe(false);
  });

  test('rechaza un resumen de cuenta aunque mencione un monto', () => {
    expect(esNotificacionDeCompra({
      titulo: 'Resumen de tu tarjeta',
      texto: 'Tu resumen cerró en $45.230, vencimiento 10/10',
    })).toBe(false);
  });
});
