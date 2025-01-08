import React, { useMemo } from 'react';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement } from 'chart.js';
import '../App.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement);

const Dashboard = ({ data }) => {
    // Prepara los datos para los gráficos
    const gastosMensuales = useMemo(() => {
        const gastos = {};
        if (Array.isArray(data)) {
            data.forEach(item => {
                const mes = new Date(item.fecha.split('/').reverse().join('-')).toLocaleString('es-ES', { month: 'long' });
                if (!gastos[mes]) {
                    gastos[mes] = 0;
                }
                gastos[mes] += parseFloat(item.precio.replace('$', ''));
            });
        }
        return gastos;
    }, [data]);

    const distribucionGastos = useMemo(() => {
        const distribucion = {};
        if (Array.isArray(data)) {
            data.forEach(item => {
                if (!distribucion[item.objeto]) {
                    distribucion[item.objeto] = 0;
                }
                distribucion[item.objeto] += parseFloat(item.precio.replace('$', ''));
            });
        }
        return distribucion;
    }, [data]);

    const gastosPorTipo = useMemo(() => {
        const tipos = { credito: 0, debito: 0 };
        if (Array.isArray(data)) {
            data.forEach(item => {
                if (item.tipo === 'credito') {
                    tipos.credito += parseFloat(item.precio.replace('$', ''));
                } else if (item.tipo === 'debito') {
                    tipos.debito += parseFloat(item.precio.replace('$', ''));
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

    const gastosPorBanco = useMemo(() => {
        const bancos = {};
        if (Array.isArray(data)) {
            data.forEach(item => {
                if (!bancos[item.banco]) {
                    bancos[item.banco] = 0;
                }
                bancos[item.banco] += parseFloat(item.precio.replace('$', ''));
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
                medios[item.medio] += parseFloat(item.precio.replace('$', ''));
            });
        }
        return medios;
    }, [data]);

    const gastosHormiga = useMemo(() => {
        const gastos = {};
        if (Array.isArray(data)) {
            data.forEach(item => {
                if (item.precio && parseFloat(item.precio.replace('$', '')) < 20000) {
                    if (!gastos[item.objeto]) {
                        gastos[item.objeto] = 0;
                    }
                    gastos[item.objeto] += parseFloat(item.precio.replace('$', ''));
                }
            });
        }
        return gastos;
    }, [data]);

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
        labels: Object.keys(distribucionGastos),
        datasets: [
            {
                label: 'Distribución de Gastos',
                data: Object.values(distribucionGastos),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
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
                backgroundColor: 'rgba(255, 159, 64, 0.6)',
            },
        ],
    };

    const barDataCantidadGastosPorTipo = {
        labels: ['Crédito', 'Débito'],
        datasets: [
            {
                label: 'Cantidad de Gastos por Tipo',
                data: [cantidadGastosPorTipo.credito, cantidadGastosPorTipo.debito],
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
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
            </div>
        </div>
    );
};

export default Dashboard;