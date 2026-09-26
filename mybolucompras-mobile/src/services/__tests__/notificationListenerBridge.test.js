// AsyncStorage en memoria con latencia real (cede el event loop en cada
// operación), para que los read-modify-write concurrentes se intercalen igual
// que en el dispositivo cuando llegan varias headless tasks juntas.
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  const tick = () => new Promise((r) => setTimeout(r, 0));
  return {
    __store: store,
    getItem: jest.fn(async (k) => { await tick(); return store.has(k) ? store.get(k) : null; }),
    setItem: jest.fn(async (k, v) => { await tick(); store.set(k, v); }),
  };
});
jest.mock('react-native-android-notification-listener', () => ({}));

const AsyncStorage = require('@react-native-async-storage/async-storage');
const { notificationListenerBridge } = require('../notificationListenerBridge');

const entrada = (i) => ({ packageName: 'com.banco', titulo: `t${i}`, texto: `x${i}`, timestamp: '2026-09-24T22:00:00Z' });

describe('notificationListenerBridge cola', () => {
  beforeEach(() => AsyncStorage.__store.clear());

  test('encolados concurrentes no pierden entradas', async () => {
    await Promise.all([0, 1, 2, 3, 4].map((i) => notificationListenerBridge.encolarNotificacion(entrada(i))));

    const cola = await notificationListenerBridge.leerYVaciarCola();
    expect(cola.map((e) => e.titulo).sort()).toEqual(['t0', 't1', 't2', 't3', 't4']);
  });

  test('una entrada encolada mientras se vacía la cola no se pierde', async () => {
    await notificationListenerBridge.encolarNotificacion(entrada(0));

    const [drenada] = await Promise.all([
      notificationListenerBridge.leerYVaciarCola(),
      notificationListenerBridge.encolarNotificacion(entrada(1)),
    ]);
    const resto = await notificationListenerBridge.leerYVaciarCola();

    expect([...drenada, ...resto].map((e) => e.titulo).sort()).toEqual(['t0', 't1']);
  });
});
