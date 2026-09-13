const { esDuplicado } = require('../dedup');

const base = {
  monto: 12000,
  ultimos4: '2665',
  fecha_detectada: '2026-09-12T14:36:00.000Z',
  estado: 'pendiente',
};

describe('esDuplicado', () => {
  test('detecta el mismo monto y tarjeta dentro de 5 minutos', () => {
    const candidata = { ...base, fecha_detectada: '2026-09-12T14:38:00.000Z' };
    expect(esDuplicado(candidata, [base])).toBe(true);
  });

  test('no lo considera duplicado si pasaron más de 5 minutos', () => {
    const candidata = { ...base, fecha_detectada: '2026-09-12T14:50:00.000Z' };
    expect(esDuplicado(candidata, [base])).toBe(false);
  });

  test('no lo considera duplicado si el monto difiere', () => {
    const candidata = { ...base, monto: 500 };
    expect(esDuplicado(candidata, [base])).toBe(false);
  });

  test('ignora filas ya descartadas', () => {
    const existente = { ...base, estado: 'descartado' };
    const candidata = { ...base };
    expect(esDuplicado(candidata, [existente])).toBe(false);
  });
});
