// Demo mode: activo cuando las env vars de Supabase no están configuradas
export const isDemoMode = () => {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  return !url || url.includes('TU_PROYECTO') || url === 'https://TU_PROYECTO.supabase.co';
};

export const DEMO_CREDENTIALS = {
  email: 'demo@mybolucompras.com',
  password: 'demo1234',
};

export const DEMO_USER = {
  id: 'demo-user-id',
  email: 'demo@mybolucompras.com',
  user_metadata: { nombre: 'Usuario Demo' },
};

export const DEMO_GASTOS = [
  // Mayo 2025
  { id: 'g1',  isFijo: true,  objeto: 'Netflix',             fecha: '01/05/2025', medio: 'Visa',         cuotas: 1,  tipo: 'debito',  moneda: 'ARS', banco: 'Santander',    cantidad: 1, precio: '$ 8500.00',   etiqueta: 'Entretenimiento' },
  { id: 'g2',  isFijo: true,  objeto: 'Spotify',             fecha: '01/05/2025', medio: 'Visa',         cuotas: 1,  tipo: 'debito',  moneda: 'ARS', banco: 'Santander',    cantidad: 1, precio: '$ 4200.00',   etiqueta: 'Entretenimiento' },
  { id: 'g3',  isFijo: true,  objeto: 'Gimnasio',            fecha: '01/05/2025', medio: 'Transferencia',cuotas: 1,  tipo: 'debito',  moneda: 'ARS', banco: 'Galicia',      cantidad: 1, precio: '$ 18000.00',  etiqueta: 'Salud' },
  { id: 'g4',  isFijo: false, objeto: 'Supermercado Coto',   fecha: '03/05/2025', medio: 'Efectivo',     cuotas: 1,  tipo: 'debito',  moneda: 'ARS', banco: '',             cantidad: 1, precio: '$ 52000.00',  etiqueta: 'Comida' },
  { id: 'g5',  isFijo: false, objeto: 'Nafta YPF',           fecha: '07/05/2025', medio: 'Efectivo',     cuotas: 1,  tipo: 'debito',  moneda: 'ARS', banco: '',             cantidad: 1, precio: '$ 32000.00',  etiqueta: 'Transporte' },
  { id: 'g6',  isFijo: false, objeto: 'Restaurante La Mar',  fecha: '10/05/2025', medio: 'MasterCard',   cuotas: 1,  tipo: 'debito',  moneda: 'ARS', banco: 'Galicia',      cantidad: 1, precio: '$ 28500.00',  etiqueta: 'Comida' },
  { id: 'g7',  isFijo: false, objeto: 'Farmacia',            fecha: '14/05/2025', medio: 'Efectivo',     cuotas: 1,  tipo: 'debito',  moneda: 'ARS', banco: '',             cantidad: 1, precio: '$ 9800.00',   etiqueta: 'Salud' },
  { id: 'g8',  isFijo: false, objeto: 'Delivery Rappi',      fecha: '17/05/2025', medio: 'Mercado Pago', cuotas: 1,  tipo: 'debito',  moneda: 'ARS', banco: '',             cantidad: 1, precio: '$ 14200.00',  etiqueta: 'Comida' },
  // Abril 2025
  { id: 'g9',  isFijo: false, objeto: 'Zapatillas Adidas',   fecha: '10/04/2025', medio: 'MasterCard',   cuotas: 6,  tipo: 'credito', moneda: 'ARS', banco: 'Santander',    cantidad: 1, precio: '$ 120000.00', etiqueta: 'Ropa' },
  { id: 'g10', isFijo: false, objeto: 'Ropa trabajo',        fecha: '15/04/2025', medio: 'Visa',         cuotas: 3,  tipo: 'credito', moneda: 'ARS', banco: 'Santander',    cantidad: 1, precio: '$ 55000.00',  etiqueta: 'Ropa' },
  { id: 'g11', isFijo: false, objeto: 'Libros técnicos',     fecha: '22/04/2025', medio: 'Mercado Pago', cuotas: 1,  tipo: 'debito',  moneda: 'ARS', banco: '',             cantidad: 2, precio: '$ 12000.00',  etiqueta: 'Educación' },
  { id: 'g12', isFijo: false, objeto: 'Supermercado Disco',  fecha: '05/04/2025', medio: 'Visa',         cuotas: 1,  tipo: 'debito',  moneda: 'ARS', banco: 'Santander',    cantidad: 1, precio: '$ 48000.00',  etiqueta: 'Comida' },
  { id: 'g13', isFijo: false, objeto: 'Uber',                fecha: '19/04/2025', medio: 'Mercado Pago', cuotas: 1,  tipo: 'debito',  moneda: 'ARS', banco: '',             cantidad: 1, precio: '$ 7500.00',   etiqueta: 'Transporte' },
  { id: 'g14', isFijo: false, objeto: 'Consulta médica',     fecha: '28/04/2025', medio: 'Efectivo',     cuotas: 1,  tipo: 'debito',  moneda: 'ARS', banco: '',             cantidad: 1, precio: '$ 22000.00',  etiqueta: 'Salud' },
  // Marzo 2025
  { id: 'g15', isFijo: false, objeto: 'Celular Samsung',     fecha: '01/03/2025', medio: 'Visa',         cuotas: 12, tipo: 'credito', moneda: 'USD', banco: 'Santander',    cantidad: 1, precio: '$ 450.00',    etiqueta: 'Tecnología' },
  { id: 'g16', isFijo: false, objeto: 'Curso programación',  fecha: '05/03/2025', medio: 'Mercado Pago', cuotas: 1,  tipo: 'debito',  moneda: 'ARS', banco: '',             cantidad: 1, precio: '$ 48000.00',  etiqueta: 'Educación' },
  { id: 'g17', isFijo: false, objeto: 'Restaurante Italiana',fecha: '15/03/2025', medio: 'MasterCard',   cuotas: 1,  tipo: 'debito',  moneda: 'ARS', banco: 'Galicia',      cantidad: 1, precio: '$ 38000.00',  etiqueta: 'Comida' },
  { id: 'g18', isFijo: false, objeto: 'Supermercado Carrefour',fecha:'20/03/2025', medio: 'Efectivo',    cuotas: 1,  tipo: 'debito',  moneda: 'ARS', banco: '',             cantidad: 1, precio: '$ 61000.00',  etiqueta: 'Comida' },
  { id: 'g19', isFijo: false, objeto: 'Impuesto patente',    fecha: '25/03/2025', medio: 'Transferencia',cuotas: 1,  tipo: 'debito',  moneda: 'ARS', banco: 'Santander',    cantidad: 1, precio: '$ 74000.00',  etiqueta: 'Hogar' },
  // Febrero 2025
  { id: 'g20', isFijo: false, objeto: 'Ropa verano',         fecha: '08/02/2025', medio: 'Visa',         cuotas: 3,  tipo: 'credito', moneda: 'ARS', banco: 'Santander',    cantidad: 1, precio: '$ 72000.00',  etiqueta: 'Ropa' },
  { id: 'g21', isFijo: false, objeto: 'Comida delivery',     fecha: '14/02/2025', medio: 'Mercado Pago', cuotas: 1,  tipo: 'debito',  moneda: 'ARS', banco: '',             cantidad: 1, precio: '$ 19500.00',  etiqueta: 'Comida' },
  { id: 'g22', isFijo: false, objeto: 'Supermercado Coto',   fecha: '22/02/2025', medio: 'Efectivo',     cuotas: 1,  tipo: 'debito',  moneda: 'ARS', banco: '',             cantidad: 1, precio: '$ 57000.00',  etiqueta: 'Comida' },
  { id: 'g23', isFijo: false, objeto: 'Mantenimiento auto',  fecha: '18/02/2025', medio: 'Efectivo',     cuotas: 1,  tipo: 'debito',  moneda: 'ARS', banco: '',             cantidad: 1, precio: '$ 85000.00',  etiqueta: 'Transporte' },
  // Enero 2025
  { id: 'g24', isFijo: false, objeto: 'Vacaciones Bariloche',fecha: '10/01/2025', medio: 'Visa',         cuotas: 6,  tipo: 'credito', moneda: 'ARS', banco: 'Santander',    cantidad: 1, precio: '$ 380000.00', etiqueta: 'Hogar' },
  { id: 'g25', isFijo: false, objeto: 'Medicamentos',        fecha: '08/01/2025', medio: 'Efectivo',     cuotas: 1,  tipo: 'debito',  moneda: 'ARS', banco: '',             cantidad: 1, precio: '$ 25000.00',  etiqueta: 'Salud' },
  { id: 'g26', isFijo: false, objeto: 'Supermercado Jumbo',  fecha: '18/01/2025', medio: 'MasterCard',   cuotas: 1,  tipo: 'debito',  moneda: 'ARS', banco: 'Galicia',      cantidad: 1, precio: '$ 68000.00',  etiqueta: 'Comida' },
  // Diciembre 2024
  { id: 'g27', isFijo: false, objeto: 'Regalos Navidad',     fecha: '20/12/2024', medio: 'Visa',         cuotas: 3,  tipo: 'credito', moneda: 'ARS', banco: 'Santander',    cantidad: 1, precio: '$ 145000.00', etiqueta: 'Hogar' },
  { id: 'g28', isFijo: false, objeto: 'Cena Navidad',        fecha: '24/12/2024', medio: 'MasterCard',   cuotas: 1,  tipo: 'debito',  moneda: 'ARS', banco: 'Galicia',      cantidad: 1, precio: '$ 58000.00',  etiqueta: 'Comida' },
  { id: 'g29', isFijo: false, objeto: 'Notebook Dell accesorios',fecha:'12/12/2024',medio:'MasterCard',  cuotas: 6,  tipo: 'credito', moneda: 'ARS', banco: 'Galicia',      cantidad: 1, precio: '$ 180000.00', etiqueta: 'Tecnología' },
  // Noviembre 2024
  { id: 'g30', isFijo: false, objeto: 'Campera de invierno', fecha: '05/11/2024', medio: 'MasterCard',   cuotas: 3,  tipo: 'credito', moneda: 'ARS', banco: 'Galicia',      cantidad: 1, precio: '$ 95000.00',  etiqueta: 'Ropa' },
  { id: 'g31', isFijo: false, objeto: 'Supermercado Coto',   fecha: '12/11/2024', medio: 'Efectivo',     cuotas: 1,  tipo: 'debito',  moneda: 'ARS', banco: '',             cantidad: 1, precio: '$ 43000.00',  etiqueta: 'Comida' },
  { id: 'g32', isFijo: false, objeto: 'SUBE carga',          fecha: '20/11/2024', medio: 'Efectivo',     cuotas: 1,  tipo: 'debito',  moneda: 'ARS', banco: '',             cantidad: 1, precio: '$ 8000.00',   etiqueta: 'Transporte' },
  // Octubre 2024
  { id: 'g33', isFijo: false, objeto: 'Monitor LG 27"',      fecha: '08/10/2024', medio: 'Visa',         cuotas: 12, tipo: 'credito', moneda: 'ARS', banco: 'Santander',    cantidad: 1, precio: '$ 420000.00', etiqueta: 'Tecnología' },
  { id: 'g34', isFijo: false, objeto: 'Supermercado Disco',  fecha: '15/10/2024', medio: 'Visa',         cuotas: 1,  tipo: 'debito',  moneda: 'ARS', banco: 'Santander',    cantidad: 1, precio: '$ 51000.00',  etiqueta: 'Comida' },
  { id: 'g35', isFijo: false, objeto: 'Nafta Shell',         fecha: '25/10/2024', medio: 'Efectivo',     cuotas: 1,  tipo: 'debito',  moneda: 'ARS', banco: '',             cantidad: 1, precio: '$ 29000.00',  etiqueta: 'Transporte' },
];

export const DEMO_MYDATA = {
  cierre: '2025-05-20',
  vencimiento: '2025-05-30',
  cierreAnterior: '2025-04-20',
  vencimientoAnterior: '2025-04-30',
  fondos: 480000,
  etiquetas: [
    { nombre: 'Entretenimiento', color: '#6366F1' },
    { nombre: 'Comida',          color: '#10B981' },
    { nombre: 'Ropa',            color: '#F59E0B' },
    { nombre: 'Transporte',      color: '#3B82F6' },
    { nombre: 'Salud',           color: '#EF4444' },
    { nombre: 'Tecnología',      color: '#8B5CF6' },
    { nombre: 'Educación',       color: '#06B6D4' },
    { nombre: 'Hogar',           color: '#84CC16' },
  ],
  presupuestos: {
    Entretenimiento: { monto: 20000,  visible: true },
    Comida:          { monto: 90000,  visible: true },
    Ropa:            { monto: 60000,  visible: true },
    Transporte:      { monto: 35000,  visible: true },
    Salud:           { monto: 30000,  visible: true },
    Tecnología:      { monto: 120000, visible: true },
    Educación:       { monto: 50000,  visible: true },
    Hogar:           { monto: 80000,  visible: true },
  },
};
