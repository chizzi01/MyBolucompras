import React, { useMemo } from 'react';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement } from 'chart.js';
import '../App.css';
import Timeline from './Timeline';
import { calcularCuotasRestantesCredito, calcularCuotasRestantes } from './Table';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement);

const Dashboard = ({ data, mydata }) => {
    // Función helper para parsear precios en formato argentino
    const parsePrecio = (precio) => {
        const clean = String(precio).replace(/\s|\$/g, '');
        // Si tiene coma, es formato argentino (miles con punto, decimal con coma)
        if (clean.includes(',')) {
            return parseFloat(clean.replace(/\./g, '').replace(',', '.'));
        }
        // Si no tiene coma, es formato US (decimal con punto)
        return parseFloat(clean);
    };

    const getCierreDia = () => {
        // mydata.cierre es 'yyyy-mm-dd' o similar; tomamos solo el día
        if (!mydata?.cierre) return 1;
        const d = new Date(mydata.cierre);
        return Number.isNaN(d.getTime()) ? 1 : d.getDate();
    };

    const monthKey = (date) =>
        `${date.toLocaleString('es-ES', { month: 'long' })} ${date.getFullYear()}`;

    const monthDiff = (from, to) =>
        (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());

    const addMonths = (date, n) => new Date(date.getFullYear(), date.getMonth() + n, 1);

    // Prepara los datos para los gráficos
    const gastosMensuales = useMemo(() => {
        const gastos = {};
        if (Array.isArray(data)) {
            // Ordena los datos por fecha
            const sortedData = [...data].sort((a, b) => {
                const fechaA = new Date(a.fecha.split('/').reverse().join('-'));
                const fechaB = new Date(b.fecha.split('/').reverse().join('-'));
                return fechaA - fechaB;
            });

            sortedData.forEach(item => {
                const fecha = new Date(item.fecha.split('/').reverse().join('-'));
                const mes = fecha.toLocaleString('es-ES', { month: 'long' });
                const año = fecha.getFullYear();
                const mesAño = `${mes} ${año}`;
                if (!gastos[mesAño]) {
                    gastos[mesAño] = 0;
                }
                gastos[mesAño] += parsePrecio(item.precio);
            });
        }
        return gastos;
    }, [data]);

   const pagosFuturos = useMemo(() => {
  const pagos = {};
  const hoy = new Date();
  const actualYm = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  // Inicializa próximos 6 meses
  for (let i = 0; i < 6; i++) {
    const m = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
    const key = `${m.toLocaleString('es-ES', { month: 'long' })} ${m.getFullYear()}`;
    pagos[key] = 0;
  }

  if (!Array.isArray(data)) return pagos;

  const cierreDay = new Date(mydata.cierre).getDate(); // día del cierre (1–31)

  data.forEach((item) => {
    const fechaCompra = new Date(item.fecha.split('/').reverse().join('-'));
    const cuotas = parseInt(item.cuotas, 10) || 0;
    const precioNum = parsePrecio(item.precio); // viene como total para varios créditos, por el log

    // // Fijos: se repiten todos los meses
    // if (item.isFijo) {
    //   for (let i = 0; i < 6; i++) {
    //     const m = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
    //     const key = `${m.toLocaleString('es-ES', { month: 'long' })} ${m.getFullYear()}`;
    //     pagos[key] += precioNum;
    //   }
    //   return;
    // }

    // Crédito (o transferencia en cuotas)
    const esCredito = item.tipo === 'credito' || (item.medio === 'Transferencia' && cuotas > 1);

    if (esCredito && cuotas > 0) {
      // PRECIO POR CUOTA: dividir el total por cantidad de cuotas
      const precioPorCuota = precioNum / cuotas;

      // Mes de primera liquidación según día de cierre
      const firstStatementMonth = new Date(
        fechaCompra.getFullYear(),
        fechaCompra.getMonth() + (fechaCompra.getDate() > cierreDay ? 1 : 0),
        1
      );

      // Diferencia de meses (firstStatementMonth - actualYm)
      const diffMeses =
        (firstStatementMonth.getFullYear() - actualYm.getFullYear()) * 12 +
        (firstStatementMonth.getMonth() - actualYm.getMonth());

      // Si diffMeses > 0, arranca en el futuro; si <= 0, ya venía facturando: arrancamos en el mes actual
      const mesInicioOffset = Math.max(0, diffMeses);

      // Cuotas restantes reales desde hoy
      const cuotasRestantes = calcularCuotasRestantesCredito(
        item.fecha,
        cuotas,
        mydata.vencimiento,
        mydata.cierre,
        mydata.vencimientoAnterior,
        mydata.cierreAnterior
      );

      if (cuotasRestantes > 0) {
        for (let i = 0; i < cuotasRestantes && mesInicioOffset + i < 6; i++) {
          const mesPago = new Date(hoy.getFullYear(), hoy.getMonth() + mesInicioOffset + i, 1);
          const key = `${mesPago.toLocaleString('es-ES', { month: 'long' })} ${mesPago.getFullYear()}`;
          pagos[key] += precioPorCuota;
        }
      }
      return;
    }

    // Débito / Efectivo / Transferencia en una sola vez
    if (item.tipo === 'debito' || item.medio === 'Efectivo' || (item.medio === 'Transferencia' && cuotas <= 1)) {
      const compraYm = new Date(fechaCompra.getFullYear(), fechaCompra.getMonth(), 1);
      // Solo si cae entre los próximos 6 meses (y no en el pasado)
      const diffMesesCompra =
        (compraYm.getFullYear() - actualYm.getFullYear()) * 12 +
        (compraYm.getMonth() - actualYm.getMonth());
      if (diffMesesCompra >= 0 && diffMesesCompra < 6) {
        const key = `${compraYm.toLocaleString('es-ES', { month: 'long' })} ${compraYm.getFullYear()}`;
        pagos[key] += precioNum;
      }
    }
  });

  return pagos;
}, [data, mydata]);


    // const distribucionGastos = useMemo(() => {
    //    const distribucion = {};
    //    if (Array.isArray(data)) {
    //    data.forEach(item => {
    //    if (!distribucion[item.objeto]) {
    //    distribucion[item.objeto] = 0;
    //    }
    //    distribucion[item.objeto] += parseFloat(item.precio.replace('$', '') / item.cuotas).toFixed(2);
    //    });
    //    }
    //    return distribucion;
    // }, [data]);



    const gastosPorTipo = useMemo(() => {
        const tipos = { credito: 0, debito: 0 };
        if (Array.isArray(data)) {
            data.forEach(item => {
                if (item.tipo === 'credito') {
                    tipos.credito += parsePrecio(item.precio);
                } else if (item.tipo === 'debito') {
                    tipos.debito += parsePrecio(item.precio);
                }
            });
        }
        return tipos;
    }, [data]);

    const cantidadGastosPorTipo = useMemo(() => {
        const tipos = { credito: 0, debito: 0 };
        if (Array.isArray(data)) {
            data.forEach(item => {
                if (item.tipo === 'credito') {
                    tipos.credito += 1;
                } else if (item.tipo === 'debito') {
                    tipos.debito += 1;
                }
            });
        }
        return tipos;
    }, [data]);

    const distribucionGastosPorEtiqueta = useMemo(() => {
        const etiquetas = {};
        if (Array.isArray(data)) {
            data.forEach(item => {
                const etiqueta = item.etiqueta || 'Sin etiqueta';
                const precio = parsePrecio(item.precio);
                const gasto = item.tipo === 'credito' ? precio / item.cuotas : precio;

                if (!etiquetas[etiqueta]) {
                    etiquetas[etiqueta] = 0;
                }
                etiquetas[etiqueta] += gasto;
            });
        }
        return etiquetas;
    }, [data]);

    const procesarDistribucionGastos = (distribucion) => {
        const procesado = {};

        Object.keys(distribucion).forEach((etiqueta) => {
            const key = !etiqueta || etiqueta === 'undefined' ? 'Sin etiqueta' : etiqueta;
            if (!procesado[key]) {
                procesado[key] = 0;
            }
            procesado[key] += distribucion[etiqueta];
        });

        return procesado;
    };
    const distribucionProcesada = procesarDistribucionGastos(distribucionGastosPorEtiqueta);


    const gastosPorBanco = useMemo(() => {
        const bancos = {};
        if (Array.isArray(data)) {
            data.forEach(item => {
                if (!bancos[item.banco]) {
                    bancos[item.banco] = 0;
                }
                bancos[item.banco] += parsePrecio(item.precio);
            });
        }
        return bancos;
    }, [data]);

    const gastosPorMedio = useMemo(() => {
        const medios = {};
        if (Array.isArray(data)) {
            data.forEach(item => {
                if (!medios[item.medio]) {
                    medios[item.medio] = 0;
                }
                medios[item.medio] += parsePrecio(item.precio);
            });
        }
        return medios;
    }, [data]);

    const gastosHormiga = useMemo(() => {
        const gastos = {};
        if (Array.isArray(data)) {
            data.forEach(item => {
                const precio = parsePrecio(item.precio);
                if (isNaN(precio)) return;

                // Solo crédito tiene cuotas; débito/efectivo => 0 cuotas restantes
                const cuotasRestantes = item.tipo === 'credito'
                    ? calcularCuotasRestantesCredito(
                        item.fecha,    // dd/mm/yyyy
                        item.cuotas,
                        mydata.vencimiento,    // yyyy-mm-dd
                        mydata.cierre,    // yyyy-mm-dd
                        mydata.vencimientoAnterior,
                        mydata.cierreAnterior
                    )
                    : calcularCuotasRestantes(item.fecha, item.cuotas);

                // Solo incluir si es < 25000 y tiene al menos 1 cuota restante
                if (precio < 25000 && cuotasRestantes >= 1) {
                    if (!gastos[item.objeto]) gastos[item.objeto] = 0;
                    gastos[item.objeto] += precio;
                }
            });
        }
        return Object.keys(gastos).length === 0 ? { 'Sin gastos hormiga': 0 } : gastos;
    }, [data, mydata]);

    const barData = {
        labels: Object.keys(gastosMensuales),
        datasets: [
            {
                label: 'Gastos Mensuales',
                data: Object.values(gastosMensuales),
                backgroundColor: 'rgba(75, 192, 192, 0.6)',


            },
        ],
    };

    const pieData = {
        labels: Object.keys(distribucionProcesada),
        datasets: [
            {
                label: 'Gastos por etiqueta',
                data: Object.values(distribucionProcesada),
                backgroundColor: ['rgba(255, 99, 132, 0.6)',

                    'rgba(255, 159, 64, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(153, 102, 255, 0.6)',
                ],
            },
        ],
    };

    const doughnutData = {
        labels: ['Crédito', 'Débito'],
        datasets: [
            {
                label: 'Gastos por Tipo',
                data: [gastosPorTipo.credito, gastosPorTipo.debito],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                ],
            },
        ],
    };

    const barDataBancos = {
        labels: Object.keys(gastosPorBanco),
        datasets: [
            {
                label: 'Gastos por Banco',
                data: Object.values(gastosPorBanco),
                backgroundColor: 'rgba(153, 102, 255, 0.6)',
            },
        ],
    };

    const barDataMedios = {
        labels: Object.keys(gastosPorMedio),
        datasets: [
            {
                label: 'Gastos por Medio de Pago',
                data: Object.values(gastosPorMedio),
                backgroundColor: ['rgba(255, 159, 64, 0.6)',

                    'rgba(255, 206, 86, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(153, 102, 255, 0.6)',
                ],
            },
        ],
    };

    const barDataCantidadGastosPorTipo = {
        labels: ['Crédito', 'Débito'],
        datasets: [
            {
                label: 'Cantidad de Gastos por Tipo',
                data: [cantidadGastosPorTipo.credito, cantidadGastosPorTipo.debito],
                backgroundColor: ['rgba(255, 99, 132, 0.6)', 'rgba(75, 192, 192, 0.6)'
                ],

            },
        ],
    };

    const gastosHormigaData = {
        labels: Object.keys(gastosHormiga),
        datasets: [
            {
                label: 'Gastos Hormiga',
                data: Object.values(gastosHormiga),
                backgroundColor: 'rgba(255, 206, 86, 0.6)',
            },
        ],
    };

    return (
        <div className="dashboard">
            <div className="chart-container">
                <div className="chart">
                    <Bar data={barData} options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Gastos Mensuales' } } }} />
                </div>
                <div className="chart">
                    <Bar data={barDataBancos} options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Gastos por Banco' } } }} />
                </div>
                <div className="chart">
                    <Bar data={barDataMedios} options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Gastos por Medio de Pago' } } }} />
                </div>
                <div className="chart">
                    <Bar data={barDataCantidadGastosPorTipo} options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Cantidad de Gastos por Tipo' } } }} />
                </div>
                <div className="pie">
                    <Pie data={pieData} options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Distribución de Gastos' } } }} />
                </div>
                <div className="pie">
                    <Doughnut data={doughnutData} options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Gastos por Tipo' } } }} />
                </div>
                <div className="pie">
                    <Doughnut data={gastosHormigaData} options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Gastos hormiga' } } }} />
                </div>
                <div className="timeline">
                    <Timeline pagosFuturos={pagosFuturos} />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;