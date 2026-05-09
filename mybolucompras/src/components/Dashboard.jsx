import React, { useMemo } from 'react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    RadialBarChart, RadialBar
} from 'recharts';
import '../App.css';
import Timeline from './Timeline';
import { calcularCuotasRestantesCredito, calcularCuotasRestantes } from './Table';

const PALETTE = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#84cc16'];

const formatARS = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '$0';
    if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    if (Math.abs(val) >= 1_000) return `$${(val / 1_000).toFixed(0)}k`;
    return `$${val.toFixed(0)}`;
};

const CustomTooltipARS = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="dash-tooltip">
            <p className="dash-tooltip-label">{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color }}>
                    {p.name}: <strong>{formatARS(p.value)}</strong>
                </p>
            ))}
        </div>
    );
};

const CustomTooltipPie = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const { name, value } = payload[0];
    return (
        <div className="dash-tooltip">
            <p className="dash-tooltip-label">{name}</p>
            <p style={{ color: payload[0].payload.fill }}><strong>{formatARS(value)}</strong></p>
        </div>
    );
};

const KpiCard = ({ title, value, sub, color }) => (
    <div className="kpi-card" style={{ borderTop: `3px solid ${color}` }}>
        <p className="kpi-title">{title}</p>
        <p className="kpi-value" style={{ color }}>{value}</p>
        {sub && <p className="kpi-sub">{sub}</p>}
    </div>
);

const Dashboard = ({ data, mydata }) => {
    const parsePrecio = (precio) => {
        const clean = String(precio).replace(/\s|\$/g, '');
        if (clean.includes(',')) return parseFloat(clean.replace(/\./g, '').replace(',', '.'));
        return parseFloat(clean);
    };

    const monthKey = (date) =>
        `${date.toLocaleString('es-ES', { month: 'short' })} ${date.getFullYear()}`;

    const monthDiff = (from, to) =>
        (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());

    const addMonths = (date, n) => new Date(date.getFullYear(), date.getMonth() + n, 1);

    const dataARS = useMemo(() =>
        Array.isArray(data) ? data.filter(item => (item.moneda || 'ARS') === 'ARS') : [],
        [data]);

    const gastosMensuales = useMemo(() => {
        const gastos = {};
        const sorted = [...dataARS].sort((a, b) => {
            const fa = new Date(a.fecha.split('/').reverse().join('-'));
            const fb = new Date(b.fecha.split('/').reverse().join('-'));
            return fa - fb;
        });
        sorted.forEach(item => {
            const fecha = new Date(item.fecha.split('/').reverse().join('-'));
            const key = `${fecha.toLocaleString('es-ES', { month: 'short' })} ${fecha.getFullYear()}`;
            gastos[key] = (gastos[key] || 0) + parsePrecio(item.precio);
        });
        return Object.entries(gastos).map(([mes, total]) => ({ mes, total }));
    }, [dataARS]);

    const gastosPorTipo = useMemo(() => {
        const tipos = { credito: 0, debito: 0 };
        dataARS.forEach(item => {
            if (item.tipo === 'credito') tipos.credito += parsePrecio(item.precio);
            else if (item.tipo === 'debito') tipos.debito += parsePrecio(item.precio);
        });
        return [
            { name: 'Crédito', value: tipos.credito, fill: '#6366f1' },
            { name: 'Débito', value: tipos.debito, fill: '#10b981' },
        ];
    }, [dataARS]);

    const gastosPorMoneda = useMemo(() => {
        const monedas = {};
        (data || []).forEach(item => {
            const moneda = item.moneda || 'ARS';
            monedas[moneda] = (monedas[moneda] || 0) + parsePrecio(item.precio);
        });
        return Object.entries(monedas).map(([moneda, total], i) => ({
            moneda, total, fill: PALETTE[i % PALETTE.length]
        }));
    }, [data]);

    const distribucionEtiquetas = useMemo(() => {
        const etiquetas = {};
        dataARS.forEach(item => {
            const key = item.etiqueta || 'Sin etiqueta';
            const precio = parsePrecio(item.precio);
            const gasto = item.tipo === 'credito' ? precio / item.cuotas : precio;
            etiquetas[key] = (etiquetas[key] || 0) + gasto;
        });
        return Object.entries(etiquetas)
            .map(([name, value], i) => ({ name, value, fill: PALETTE[i % PALETTE.length] }))
            .sort((a, b) => b.value - a.value);
    }, [dataARS]);

    const gastosPorBanco = useMemo(() => {
        const bancos = {};
        dataARS.forEach(item => {
            bancos[item.banco] = (bancos[item.banco] || 0) + parsePrecio(item.precio);
        });
        return Object.entries(bancos)
            .map(([banco, total], i) => ({ banco, total, fill: PALETTE[i % PALETTE.length] }))
            .sort((a, b) => b.total - a.total);
    }, [dataARS]);

    const gastosPorMedio = useMemo(() => {
        const medios = {};
        dataARS.forEach(item => {
            medios[item.medio] = (medios[item.medio] || 0) + parsePrecio(item.precio);
        });
        return Object.entries(medios)
            .map(([medio, total], i) => ({ medio, total, fill: PALETTE[(i + 3) % PALETTE.length] }))
            .sort((a, b) => b.total - a.total);
    }, [dataARS]);

    const gastosHormiga = useMemo(() => {
        const gastos = {};
        dataARS.forEach(item => {
            const precio = parsePrecio(item.precio);
            if (isNaN(precio)) return;
            const cuotasRestantes = item.tipo === 'credito'
                ? calcularCuotasRestantesCredito(item.fecha, item.cuotas, mydata.vencimiento, mydata.cierre, mydata.vencimientoAnterior, mydata.cierreAnterior)
                : calcularCuotasRestantes(item.fecha, item.cuotas);
            if (precio < 25000 && cuotasRestantes >= 1) {
                gastos[item.objeto] = (gastos[item.objeto] || 0) + precio;
            }
        });
        const entries = Object.entries(gastos);
        if (!entries.length) return [{ name: 'Sin gastos hormiga', value: 0, fill: '#e5e7eb' }];
        return entries
            .map(([name, value], i) => ({ name, value, fill: PALETTE[(i + 5) % PALETTE.length] }))
            .sort((a, b) => b.value - a.value);
    }, [dataARS, mydata]);

    const pagosFuturos = useMemo(() => {
        const pagos = {};
        const hoy = new Date();
        const actualYm = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const allMonedas = Array.isArray(data) ? [...new Set(data.map(item => item.moneda || 'ARS'))] : ['ARS'];
        for (let i = 0; i < 6; i++) {
            const m = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
            pagos[monthKey(m)] = {};
            allMonedas.forEach(moneda => { pagos[monthKey(m)][moneda] = 0; });
        }
        if (!Array.isArray(data)) return pagos;
        const cierreAnterior = new Date(mydata?.cierreAnterior);
        data.forEach((item) => {
            const moneda = item.moneda || 'ARS';
            const fechaCompra = new Date(item.fecha.split('/').reverse().join('-'));
            const cuotas = parseInt(item.cuotas, 10) || 0;
            const precioNum = parsePrecio(item.precio);
            if (item.isFijo && cuotas > 0) {
                const compraYm = new Date(fechaCompra.getFullYear(), fechaCompra.getMonth(), 1);
                const diff = monthDiff(compraYm, actualYm);
                const cuotasRestantes = Math.max(0, cuotas - diff);
                for (let i = 0; i < Math.min(cuotasRestantes, 6); i++) {
                    const key = monthKey(addMonths(actualYm, i));
                    if (pagos[key]) pagos[key][moneda] += precioNum;
                }
            } else if (item.tipo === 'credito' && cuotas > 0) {
                const precioPorCuota = precioNum / cuotas;
                const firstStatementMonth = fechaCompra <= cierreAnterior ? actualYm : addMonths(actualYm, 1);
                const cuotasRestantes = calcularCuotasRestantesCredito(item.fecha, cuotas, mydata?.vencimiento, mydata?.cierre, mydata?.vencimientoAnterior, mydata?.cierreAnterior);
                if (cuotasRestantes > 0) {
                    for (let i = 0; i < Math.min(cuotasRestantes, 6); i++) {
                        const key = monthKey(addMonths(firstStatementMonth, i));
                        if (pagos[key]) pagos[key][moneda] += precioPorCuota;
                    }
                }
            } else if (!item.isFijo && (item.tipo === 'debito' || item.medio === 'Efectivo' || item.medio === 'transferencia')) {
                const key = monthKey(new Date(fechaCompra.getFullYear(), fechaCompra.getMonth(), 1));
                if (pagos[key]) pagos[key][moneda] += precioNum;
            }
        });
        return pagos;
    }, [data, mydata]);

    // KPI computations
    const kpis = useMemo(() => {
        const hoy = new Date();
        const mesActual = `${hoy.toLocaleString('es-ES', { month: 'short' })} ${hoy.getFullYear()}`;
        const totalMes = gastosMensuales.find(g => g.mes === mesActual)?.total || 0;
        const promedioMensual = gastosMensuales.length
            ? gastosMensuales.reduce((s, g) => s + g.total, 0) / gastosMensuales.length
            : 0;
        const bancoPrincipal = gastosPorBanco[0];
        const etiquetaPrincipal = distribucionEtiquetas[0];
        return { totalMes, promedioMensual, bancoPrincipal, etiquetaPrincipal };
    }, [gastosMensuales, gastosPorBanco, distribucionEtiquetas]);

    const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        if (percent < 0.05) return null;
        const RADIAN = Math.PI / 180;
        const r = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + r * Math.cos(-midAngle * RADIAN);
        const y = cy + r * Math.sin(-midAngle * RADIAN);
        return (
            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="600">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <div className="dashboard">
            {/* KPI Cards */}
            <div className="kpi-row">
                <KpiCard
                    title="Gastado este mes"
                    value={formatARS(kpis.totalMes)}
                    sub="solo ARS"
                    color="#6366f1"
                />
                <KpiCard
                    title="Promedio mensual"
                    value={formatARS(kpis.promedioMensual)}
                    sub="histórico ARS"
                    color="#10b981"
                />
                <KpiCard
                    title="Banco principal"
                    value={kpis.bancoPrincipal?.banco || '—'}
                    sub={kpis.bancoPrincipal ? formatARS(kpis.bancoPrincipal.total) : ''}
                    color="#f59e0b"
                />
                <KpiCard
                    title="Mayor categoría"
                    value={kpis.etiquetaPrincipal?.name || '—'}
                    sub={kpis.etiquetaPrincipal ? formatARS(kpis.etiquetaPrincipal.value) : ''}
                    color="#ef4444"
                />
            </div>

            {/* Charts grid */}
            <div className="dash-grid">

                {/* Gastos Mensuales - full width area chart */}
                <div className="dash-card dash-full">
                    <h3 className="dash-card-title">Evolución de Gastos Mensuales</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={gastosMensuales} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gradMes" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#ffffff' }} />
                            <YAxis tickFormatter={formatARS} tick={{ fontSize: 11, fill: '#ffffff' }} width={60} />
                            <Tooltip content={<CustomTooltipARS />} />
                            <Area type="monotone" dataKey="total" name="Total" stroke="#6366f1" strokeWidth={2} fill="url(#gradMes)" dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 5 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Gastos por Banco */}
                <div className="dash-card">
                    <h3 className="dash-card-title">Gastos por Banco</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={gastosPorBanco} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" horizontal={false} />
                            <XAxis type="number" tickFormatter={formatARS} tick={{ fontSize: 10, fill: '#ffffff' }} />
                            <YAxis type="category" dataKey="banco" tick={{ fontSize: 11, fill: '#ffffff' }} width={80} />
                            <Tooltip content={<CustomTooltipARS />} />
                            <Bar dataKey="total" name="Total" radius={[0, 6, 6, 0]}>
                                {gastosPorBanco.map((entry, i) => (
                                    <Cell key={i} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Gastos por Medio de Pago */}
                <div className="dash-card">
                    <h3 className="dash-card-title">Gastos por Medio de Pago</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={gastosPorMedio} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" horizontal={false} />
                            <XAxis type="number" tickFormatter={formatARS} tick={{ fontSize: 10, fill: '#ffffff' }} />
                            <YAxis type="category" dataKey="medio" tick={{ fontSize: 11, fill: '#ffffff' }} width={90} />
                            <Tooltip content={<CustomTooltipARS />} />
                            <Bar dataKey="total" name="Total" radius={[0, 6, 6, 0]}>
                                {gastosPorMedio.map((entry, i) => (
                                    <Cell key={i} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Distribución por Etiqueta */}
                <div className="dash-card">
                    <h3 className="dash-card-title">Distribución por Categoría</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie
                                data={distribucionEtiquetas}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={85}
                                labelLine={false}
                                label={renderCustomLabel}
                            >
                                {distribucionEtiquetas.map((entry, i) => (
                                    <Cell key={i} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltipPie />} />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#ffffff' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Crédito vs Débito */}
                <div className="dash-card">
                    <h3 className="dash-card-title">Crédito vs Débito</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie
                                data={gastosPorTipo}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={85}
                                paddingAngle={4}
                                label={renderCustomLabel}
                                labelLine={false}
                            >
                                {gastosPorTipo.map((entry, i) => (
                                    <Cell key={i} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltipPie />} />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#ffffff' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Gastos por Moneda */}
                <div className="dash-card">
                    <h3 className="dash-card-title">Gastos por Moneda</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <RadialBarChart
                            cx="50%"
                            cy="50%"
                            innerRadius={20}
                            outerRadius={90}
                            data={gastosPorMoneda}
                            startAngle={90}
                            endAngle={-270}
                        >
                            <RadialBar dataKey="total" background={{ fill: 'rgba(255,255,255,0.04)' }} label={{ position: 'insideStart', fill: '#fff', fontSize: 11 }}>
                                {gastosPorMoneda.map((entry, i) => (
                                    <Cell key={i} fill={entry.fill} />
                                ))}
                            </RadialBar>
                            <Tooltip formatter={(val) => formatARS(val)} />
                            <Legend iconType="circle" iconSize={8} formatter={(val, entry) => entry.payload.moneda} wrapperStyle={{ fontSize: 11, color: '#ffffff' }} />
                        </RadialBarChart>
                    </ResponsiveContainer>
                </div>

                {/* Gastos Hormiga */}
                <div className="dash-card">
                    <h3 className="dash-card-title">Gastos Hormiga <span className="dash-badge">{'< $25k'}</span></h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie
                                data={gastosHormiga}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={85}
                                paddingAngle={3}
                                labelLine={false}
                                label={renderCustomLabel}
                            >
                                {gastosHormiga.map((entry, i) => (
                                    <Cell key={i} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltipPie />} />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: '#ffffff' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Timeline - full width */}
                <div className="dash-card dash-full">
                    <h3 className="dash-card-title">Proyección de Pagos (6 meses)</h3>
                    <Timeline pagosFuturos={pagosFuturos} />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
