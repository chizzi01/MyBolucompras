process.env.TZ = 'America/Argentina/Buenos_Aires';

const { parseFecha } = require('../formatters');
const {
  getCuotasRestantes, gastoEntraEsteMes, getCicloTarjeta, validarFechasTarjeta, addMonths,
} = require('../cuotas');

const d = (y, m, day) => new Date(y, m - 1, day, 12);
const credito = (fecha, cuotas = 3) => ({ fecha, cuotas, tipo: 'credito', isFijo: false });
const cuotaActual = (g, mydata, hoy) => {
  const r = getCuotasRestantes(g, mydata, hoy);
  return Number(g.cuotas) - r + 1;
};

// Ciclo de septiembre: cerró 27/08 (vence 10/09), cierra 24/09 (vence 08/10).
const sep = {
  cierreAnterior: '2026-08-27', vencimientoAnterior: '2026-09-10',
  cierre: '2026-09-24', vencimiento: '2026-10-08',
};

describe('parseFecha', () => {
  test('es fecha local (no se corre al día anterior en UTC-3)', () => {
    const f = parseFecha('01/09/2026');
    expect([f.getFullYear(), f.getMonth(), f.getDate()]).toEqual([2026, 8, 1]);
  });
});

describe('validarFechasTarjeta', () => {
  test('rechaza la config que reinició cuotas (vencimientos antes del cierre)', () => {
    expect(validarFechasTarjeta({
      cierre: '2026-11-27', vencimiento: '2026-11-13',
      cierreAnterior: '2026-10-01', vencimientoAnterior: '2026-09-21',
    })).not.toBeNull();
  });
  test('rechaza un cierre a casi 2 meses del anterior', () => {
    expect(validarFechasTarjeta({ ...sep, cierre: '2026-11-27', vencimiento: '2026-12-11' })).not.toBeNull();
  });
  test('acepta un ciclo normal y campos vacíos', () => {
    expect(validarFechasTarjeta(sep)).toBeNull();
    expect(validarFechasTarjeta({ cierre: '2026-09-24', vencimiento: '2026-10-08', cierreAnterior: '', vencimientoAnterior: '' })).toBeNull();
  });
});

describe('getCicloTarjeta', () => {
  test('null si el vencimiento es anterior al cierre', () => {
    expect(getCicloTarjeta({ cierre: '2026-11-27', vencimiento: '2026-11-13' }, d(2026, 10, 1))).toBeNull();
  });
  test('ignora "anteriores" inconsistentes y los deriva', () => {
    const c = getCicloTarjeta({ ...sep, cierreAnterior: '2026-09-23', vencimientoAnterior: '2026-09-01' }, d(2026, 9, 15));
    expect(c.c0).toEqual(new Date(2026, 7, 24));
  });
  test('si el cierre pasó sin actualizar, avanza el ciclo', () => {
    const c = getCicloTarjeta(sep, d(2026, 10, 1));
    expect(c.c0).toEqual(new Date(2026, 8, 24));
    expect(c.c1).toEqual(new Date(2026, 9, 24));
  });
  test('el día del cierre todavía es del ciclo actual', () => {
    expect(getCicloTarjeta(sep, d(2026, 9, 24)).c1).toEqual(new Date(2026, 8, 24));
  });
});

describe('gastoEntraEsteMes', () => {
  test('compra posterior al cierre NO entra aunque el cierre ya haya pasado sin actualizar', () => {
    expect(gastoEntraEsteMes(credito('26/09/2026'), sep, d(2026, 10, 1))).toBe(false);
    expect(gastoEntraEsteMes(credito('20/09/2026'), sep, d(2026, 10, 1))).toBe(true);
  });
  test('compra del día del cierre entra en ese resumen', () => {
    expect(gastoEntraEsteMes(credito('24/09/2026'), sep, d(2026, 10, 1))).toBe(true);
  });
});

describe('primera_cuota guardada (gasto compartido)', () => {
  // "Pases 2 días": 10/07 en 3 cuotas con la tarjeta del creador (cierra el 24) → ago/sep/oct.
  const pases = { ...credito('10/07/2026'), primeraCuota: '2026-08' };
  // Tarjeta de quien lo recibe: cierra el 5 → con su tarjeta la primera cuota sería julio.
  const otraTarjeta = {
    cierreAnterior: '2026-09-05', vencimientoAnterior: '2026-09-18',
    cierre: '2026-10-05', vencimiento: '2026-10-19',
  };

  test('ambos ven la misma cuota sin importar la tarjeta de quien mira', () => {
    const hoy = d(2026, 10, 1);
    expect(cuotaActual(pases, sep, hoy)).toBe(3);
    expect(cuotaActual(pases, otraTarjeta, hoy)).toBe(3);
    expect(cuotaActual(credito('10/07/2026'), otraTarjeta, hoy)).not.toBe(3); // sin guardar, difería
  });
  test('sin fechas de tarjeta usa el mes calendario', () => {
    expect(cuotaActual(pases, {}, d(2026, 9, 15))).toBe(2);
  });
  test('entra este mes según la primera cuota guardada', () => {
    const hoy = d(2026, 10, 1);
    expect(gastoEntraEsteMes({ ...credito('26/09/2026'), primeraCuota: '2026-11' }, otraTarjeta, hoy)).toBe(false);
    expect(gastoEntraEsteMes({ ...credito('26/09/2026'), primeraCuota: '2026-10' }, otraTarjeta, hoy)).toBe(true);
  });
});

describe('cuota actual', () => {
  test('compra en el ciclo abierto: 1/N', () => {
    expect(cuotaActual(credito('10/09/2026'), sep, d(2026, 9, 15))).toBe(1);
  });
  test('compra del ciclo anterior: avanza en octubre (no se reinicia)', () => {
    expect(cuotaActual(credito('10/08/2026'), sep, d(2026, 9, 15))).toBe(1);
    expect(cuotaActual(credito('10/08/2026'), sep, d(2026, 10, 1))).toBe(2);
  });
  test('compra posterior al cierre de su mes: la primera cuota es un mes después', () => {
    // 28/08 cierra el 24/09 y vence el 08/10 → en octubre es la 1/3, no la 2/3.
    expect(cuotaActual(credito('28/08/2026'), sep, d(2026, 10, 1))).toBe(1);
  });
  test('compra del día 1 no se cuenta en el mes anterior', () => {
    expect(cuotaActual(credito('01/09/2026'), sep, d(2026, 10, 1))).toBe(1);
  });

  test('nunca retrocede con el paso de los días, actualice o no el cierre', () => {
    const compras = [];
    for (let dt = d(2026, 5, 1); dt <= d(2026, 12, 31); dt.setDate(dt.getDate() + 3)) {
      compras.push(`${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/2026`);
    }
    // Config "al día": se actualiza en cada cierre como lo hace ActualizarCierreModal.
    const alDia = hoy => {
      let k = 0;
      while (hoy > addMonths(new Date(2026, 8, 24, 23, 59), k)) k++;
      const iso = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
      return {
        cierreAnterior: iso(addMonths(new Date(2026, 7, 27), k)), vencimientoAnterior: iso(addMonths(new Date(2026, 8, 10), k)),
        cierre: iso(addMonths(new Date(2026, 8, 24), k)), vencimiento: iso(addMonths(new Date(2026, 9, 8), k)),
      };
    };
    for (const fecha of compras) {
      const g = credito(fecha, 6);
      let prevStale = -Infinity;
      let prevAlDia = -Infinity;
      for (let hoy = d(2026, 9, 1); hoy <= d(2027, 3, 1); hoy = new Date(hoy.getTime() + 86400000)) {
        if (parseFecha(fecha) > hoy) continue;
        const stale = cuotaActual(g, sep, hoy);
        const conUpdate = cuotaActual(g, alDia(hoy), hoy);
        expect(stale).toBeGreaterThanOrEqual(prevStale);
        expect(conUpdate).toBeGreaterThanOrEqual(prevAlDia);
        prevStale = stale;
        prevAlDia = conUpdate;
      }
    }
  });
});
