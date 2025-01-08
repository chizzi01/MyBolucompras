import React, { useState, useMemo, useEffect } from 'react';
import '../App.css';
import { TextField, Select, MenuItem, InputLabel, FormControl, Button, InputAdornment } from '@mui/material';
import Papa from 'papaparse';
import { FaEdit } from "react-icons/fa";
import { FaTrash } from "react-icons/fa";
import { PiRepeatBold } from "react-icons/pi";
import { GiReceiveMoney } from "react-icons/gi";
import { FaPiggyBank } from "react-icons/fa";
import { FaMoneyCheckDollar } from "react-icons/fa6";
import { IoMdAdd } from "react-icons/io";
import { FaCalendarAlt } from "react-icons/fa";
import { FaSwatchbook } from "react-icons/fa";
import { FaWallet } from "react-icons/fa";
import { PiMicrosoftExcelLogoFill } from "react-icons/pi";
import { FaCreditCard } from "react-icons/fa6";
import { FaMoneyBill1Wave } from "react-icons/fa6";
import { VscArrowSwap } from "react-icons/vsc";
import { VscArrowUp } from "react-icons/vsc";
import { VscArrowDown } from "react-icons/vsc";
import { MdFilterListAlt } from "react-icons/md";
import { FiSearch } from "react-icons/fi";
import { FaChartPie } from "react-icons/fa";

function Table({ data, mydata, openModal, total }) {
    // Asegúrate de que data sea un array
    if (!Array.isArray(data)) {
        return <div>No hay datos</div>; // O muestra un mensaje de error o un componente de carga
    }
    const [showFilter, setShowFilter] = useState(false);
    const [filterObject, setFilterObject] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterBank, setFilterBank] = useState('');
    const [filterMedio, setFilterMedio] = useState('');
    const [filterCount, setFilterCount] = useState(0);

    const handleFilterClick = () => {
        setShowFilter(!showFilter);
    };

    const countFilters = () => {
        let count = 0;
        if (filterObject) count++;
        if (filterType) count++;
        if (filterBank) count++;
        if (filterMedio) count++;
        setFilterCount(count);
    };

    useEffect(() => {
        countFilters();
    }, [filterObject, filterType, filterBank, filterMedio]);

    const mesActual = new Date().toLocaleString('es-ES', { month: 'long' });

    const [isSwitchOn, setIsSwitchOn] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'default' });

    const handleSwitchChange = () => {
        setIsSwitchOn(!isSwitchOn);
    };

    const handleSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        } else if (sortConfig.key === key && sortConfig.direction === 'descending') {
            direction = 'default';
        }
        setSortConfig({ key, direction });
    };

    const sortedData = useMemo(() => {
        let sortableData = [...data];
        if (sortConfig.key !== null && sortConfig.direction !== 'default') {
            sortableData.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Convertir fechas a objetos Date
                if (sortConfig.key === 'fecha') {
                    aValue = new Date(aValue.split('/').reverse().join('-'));
                    bValue = new Date(bValue.split('/').reverse().join('-'));
                }

                // Convertir precios a números
                if (sortConfig.key === 'precio') {
                    aValue = parseFloat(aValue.replace('$', ''));
                    bValue = parseFloat(bValue.replace('$', ''));
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableData;
    }, [data, sortConfig]);

    const calcularCuotasRestantes = (fecha, cuotas) => {
        const fechaActual = new Date();
        const [dia, mes, anio] = fecha.split('/');
        const fechaCompra = new Date(`${anio}-${mes}-${dia}`);
        const diferenciaMeses = (fechaActual.getFullYear() - fechaCompra.getFullYear()) * 12 + (fechaActual.getMonth() - fechaCompra.getMonth());
        const cuotasRestantes = parseInt(cuotas, 10) - diferenciaMeses;

        return cuotasRestantes < 0 ? 0 : cuotasRestantes;
    };

    const calcularCuotasRestantesCredito = (fecha, cuotas, fechaVencimiento) => {
        const fechaActual = new Date();
        const [dia, mes, anio] = fecha.split('/');
        const fechaCompra = new Date(`${anio}-${mes}-${dia}`);
        const fechaVenc = new Date(fechaVencimiento);

        // Verifica que las fechas se hayan parseado correctamente
        if (isNaN(fechaCompra) || isNaN(fechaVenc)) {
            console.error('Fecha inválida:', { fechaCompra, fechaVenc });
            return 'N/A';
        }

        const diferenciaMeses = (fechaActual.getFullYear() - fechaCompra.getFullYear()) * 12 + (fechaActual.getMonth() - fechaCompra.getMonth());
        const cuotasRestantes = parseInt(cuotas, 10) - diferenciaMeses;

        return cuotasRestantes < 0 ? 0 : cuotasRestantes;
    };

    const calcularCuotas = (item) => {
        return item.tipo === 'debito'
            ? calcularCuotasRestantes(item.fecha, item.cuotas)
            : calcularCuotasRestantesCredito(item.fecha, item.cuotas, mydata.vencimiento);
    };

    const filteredData = sortedData.filter(item => {
        return (
            (filterObject === '' || item.objeto.toLowerCase().includes(filterObject.toLowerCase())) &&
            (filterType === '' || item.tipo === filterType) &&
            (filterBank === '' || item.banco === filterBank) &&
            (filterMedio === '' || item.medio === filterMedio) &&
            (isSwitchOn || calcularCuotas(item) >= 1)
        );
    });

    const exportToExcel = () => {
        const table = document.getElementById('tabla');
        const rows = table.querySelectorAll('tr');
        const data = [];

        // Obtener encabezados
        const headers = [];
        const headerCols = rows[0].querySelectorAll('th');
        for (let j = 0; j < headerCols.length; j++) {
            headers.push(headerCols[j].innerText);
        }

        // Obtener datos de las filas
        for (let i = 1; i < rows.length; i++) {
            const row = {};
            const cols = rows[i].querySelectorAll('td');
            for (let j = 0; j < cols.length; j++) {
                row[headers[j]] = cols[j].innerText;
            }
            data.push(row);
        }

        // Convertir a CSV con PapaParse y usar un delimitador adecuado
        const csv = Papa.unparse(data, {
            header: true,
            delimiter: ';', // Cambia ',' por ';' si tu Excel usa punto y coma como separador.
        });

        // Crear un Blob y forzar la descarga
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = 'Bolucompras.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url); // Liberar memoria
    };

    const uniqueBanks = useMemo(() => {
        const banks = new Set();
        data.forEach(item => {
            if (item.banco) {
                banks.add(item.banco);
            }
        });
        return Array.from(banks);
    }, [data]);

    const mediosDePago = useMemo(() => {
        const medios = new Set();
        data.forEach(item => {
            if (item.medio) {
                medios.add(item.medio);
            }
        });
        return Array.from(medios);
    }, [data]);

    return (
        <section id="gastos">
            <div className="componentContainer">
                <div className="tituloContainer">
                    <h1 id="mesBolucompras">Mis Bolucompras del mes de: <span style={{ color: '#7BB9FF' }}>{mesActual.toLocaleUpperCase()}</span></h1>
                    <hr />
                </div>
                <div className="dropdown">
                    <button className="dropbtn"><IoMdAdd size={30} /></button>
                    <div className="dropdown-content">
                        <div className="verticalBtn-text">
                            <button id="agregar-btn" onClick={() => openModal('nuevo')}>
                                <GiReceiveMoney size={30} />
                            </button>
                            <div className="button-text">Nuevo</div>
                        </div>
                        <div className="verticalBtn-text">
                            <button id="agregarFijo-btn" onClick={() => openModal('repetitivo')}>
                                <PiRepeatBold size={30} />
                            </button>
                            <div className="button-text">Repetitivo</div>
                        </div>
                        <div className="verticalBtn-text">
                            <button id="agregarFondos-btn" onClick={() => openModal('fondos')}>
                                <FaPiggyBank size={30} />
                            </button>
                            <div className="button-text">Fondos</div>
                        </div>
                        <div className="verticalBtn-text">
                            <button id="vencimientoTarjeta-btn" onClick={() => openModal('vencimiento')}>
                                <FaMoneyCheckDollar size={30} />
                            </button>
                            <div className="button-text">Vencimiento</div>
                        </div>
                    </div>
                </div>

                <div className='dropdownFilter'>
                    <button className="dropbtnFilter" onClick={handleFilterClick}>
                        <MdFilterListAlt size={25} />
                        {filterCount > 0 && <span className="filterCount">{filterCount}</span>}
                    </button>
                    {showFilter && (
                        <div className="filter-container">
                            <div className="verticalBtn-text">
                                <TextField
                                    label="Objeto"
                                    variant="outlined"
                                    fullWidth
                                    margin="normal"
                                    value={filterObject}
                                    onChange={(e) => setFilterObject(e.target.value)}
                                    InputProps={{
                                        startAdornment: <InputAdornment position="end"><FiSearch color='white' style={{ marginRight: "5px" }} /></InputAdornment>
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            fontSize: '12px',
                                            '& fieldset': {
                                                borderColor: 'white',

                                            },
                                            '&:hover fieldset': {
                                                borderColor: 'white',
                                                color: 'white',

                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: 'white',
                                                color: 'white',
                                            },
                                        },
                                        '& .MuiInputLabel-root': {
                                            color: 'white',
                                        },
                                        '& .MuiInputLabel-root.Mui-focused': {
                                            color: 'white',
                                        },
                                    }}
                                />
                            </div>
                            <div className="verticalBtn-text">
                                <FormControl variant="outlined" fullWidth margin="normal" style={{ minWidth: '100px' }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            fontSize: '12px',
                                            '& fieldset': {
                                                borderColor: 'white',
                                            },
                                            '&:hover fieldset': {
                                                borderColor: 'white',
                                                color: 'white',
                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: 'white',
                                                color: 'white',
                                            },
                                        },
                                        '& .MuiInputLabel-root': {
                                            color: 'white',
                                        },
                                        '& .MuiInputLabel-root.Mui-focused': {
                                            color: 'white',
                                        },
                                    }}
                                >
                                    <InputLabel>Tipo</InputLabel>
                                    <Select
                                        value={filterType}
                                        onChange={(e) => setFilterType(e.target.value)}
                                        label="Tipo"
                                    >
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        <MenuItem value="debito">Débito</MenuItem>
                                        <MenuItem value="credito">Crédito</MenuItem>
                                    </Select>
                                </FormControl>
                            </div>
                            <div className="verticalBtn-text">
                                <FormControl variant="outlined" fullWidth margin="normal" style={{ minWidth: '100px' }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            fontSize: '12px',
                                            '& fieldset': {
                                                borderColor: 'white',
                                            },
                                            '&:hover fieldset': {
                                                borderColor: 'white',
                                                color: 'white',
                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: 'white',
                                                color: 'white',
                                            },
                                        },
                                        '& .MuiInputLabel-root': {
                                            color: 'white',
                                        },
                                        '& .MuiInputLabel-root.Mui-focused': {
                                            color: 'white',
                                        },
                                    }}
                                >
                                    <InputLabel>Banco</InputLabel>
                                    <Select
                                        value={filterBank}
                                        onChange={(e) => setFilterBank(e.target.value)}
                                        label="Banco"
                                    >
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {uniqueBanks.map((bank, index) => (
                                            <MenuItem key={index} value={bank}>{bank}</MenuItem>
                                        ))}

                                    </Select>
                                </FormControl>
                            </div>
                            <div className="verticalBtn-text">
                                <FormControl variant="outlined" fullWidth margin="normal" style={{ minWidth: '100px' }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            fontSize: '12px',
                                            '& fieldset': {
                                                borderColor: 'white',
                                            },
                                            '&:hover fieldset': {
                                                borderColor: 'white',
                                                color: 'white',
                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: 'white',
                                                color: 'white',
                                            },
                                        },
                                        '& .MuiInputLabel-root': {
                                            color: 'white',
                                        },
                                        '& .MuiInputLabel-root.Mui-focused': {
                                            color: 'white',
                                        },
                                    }}
                                >
                                    <InputLabel>Medio</InputLabel>
                                    <Select
                                        value={filterMedio}
                                        onChange={(e) => setFilterMedio(e.target.value)}
                                        label="Medio"
                                    >
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {mediosDePago.map((medio, index) => (
                                            <MenuItem key={index} value={medio}>{medio}</MenuItem>
                                        ))}

                                    </Select>
                                </FormControl>

                            </div>
                        </div>
                    )}
                </div>

                <div className="fondosAlign">
                    <h2 id="fondos"><FaWallet size={20} /> Fondos: <span style={{ color: "#FFB63F" }}>${parseFloat((mydata.fondos || 0) - total).toFixed(2)}</span></h2>
                </div>
                <div className="reportesAlign">
                    <button id="report-btn" onClick={() => openModal('reporte')}>
                        <FaChartPie size={20} /> Ver Reporte de Gastos
                    </button>
                </div>
                <div className="switch-align">
                    <div id="delMes" className={`verticalBtnSwitch-text ${!isSwitchOn ? 'iluminate' : ''}`}>
                        <FaCalendarAlt size={30} />
                        <label htmlFor="" className="buttonSwitch-text">DEL MES</label>
                    </div>
                    <label className="switch">
                        <input type="checkbox" id="switch" checked={isSwitchOn} onChange={handleSwitchChange} />
                        <span className="slider round"></span>
                    </label>
                    <div id="todas" className={`verticalBtnSwitch-text ${isSwitchOn ? 'iluminate' : ''}`}>
                        <FaSwatchbook size={30} />
                        <label htmlFor="" className="buttonSwitch-text">TODAS</label>
                    </div>
                </div>
                <div className="tabla">
                    <table className="demo" id="tabla">
                        <thead>
                            <tr style={{ cursor: 'pointer' }}>
                                <th onClick={() => handleSort('objeto')}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                        Objeto {sortConfig.key === 'objeto' ? (sortConfig.direction === 'ascending' ? <VscArrowUp /> : sortConfig.direction === 'descending' ? <VscArrowDown /> : <VscArrowSwap />) : <VscArrowSwap />}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('fecha')}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                        Fecha de compra {sortConfig.key === 'fecha' ? (sortConfig.direction === 'ascending' ? <VscArrowUp /> : sortConfig.direction === 'descending' ? <VscArrowDown /> : <VscArrowSwap />) : <VscArrowSwap />}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('medio')}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                        Medio de pago {sortConfig.key === 'medio' ? (sortConfig.direction === 'ascending' ? <VscArrowUp /> : sortConfig.direction === 'descending' ? <VscArrowDown /> : <VscArrowSwap />) : <VscArrowSwap />}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('cuotas')}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                        Cuotas restantes {sortConfig.key === 'cuotas' ? (sortConfig.direction === 'ascending' ? <VscArrowUp /> : sortConfig.direction === 'descending' ? <VscArrowDown /> : <VscArrowSwap />) : <VscArrowSwap />}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('banco')}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                        Banco {sortConfig.key === 'banco' ? (sortConfig.direction === 'ascending' ? <VscArrowUp /> : sortConfig.direction === 'descending' ? <VscArrowDown /> : <VscArrowSwap />) : <VscArrowSwap />}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('cantidad')}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                        Cantidad {sortConfig.key === 'cantidad' ? (sortConfig.direction === 'ascending' ? <VscArrowUp /> : sortConfig.direction === 'descending' ? <VscArrowDown /> : <VscArrowSwap />) : <VscArrowSwap />}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('precio')}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                        Precio {sortConfig.key === 'precio' ? (sortConfig.direction === 'ascending' ? <VscArrowUp /> : sortConfig.direction === 'descending' ? <VscArrowDown /> : <VscArrowSwap />) : <VscArrowSwap />}
                                    </div>
                                </th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((item, index) => (
                                <tr key={index}>
                                    <td style={{ display: "flex", gap: '5px', justifyContent: 'center', alignItems: 'center', height: '40px' }}>
                                        {item.objeto}
                                        {item.isFijo && <PiRepeatBold size={15} color='#ff9a15' />}
                                        {item.tipo === 'credito' && <FaCreditCard size={15} color='#3181ff' />}
                                        {item.tipo === 'debito' && item.isFijo == false && <FaMoneyBill1Wave size={15} color='#11af00' />}
                                    </td>
                                    <td>{item.fecha}</td>
                                    <td>{item.medio}</td>
                                    <td>{isNaN(calcularCuotas(item)) ? 'N/A' : calcularCuotas(item)}</td>
                                    <td>{item.banco}</td>
                                    <td>{item.cantidad}</td>
                                    <td>${item.precio && typeof item.precio === 'string' ? parseFloat(item.precio.replace('$', '') / item.cuotas).toFixed(2) : 'N/A'}</td>
                                    <td>
                                        <div className='buttonsActionsAlign'>
                                            {calcularCuotas(item) >= 1 ?
                                                <button className="edit-btn" id={item.id} onClick={() => openModal('editar', item)}>
                                                    <FaEdit size={15} />
                                                </button>
                                                : null}
                                            <button className="delete-btn" id={item.id} onClick={() => openModal('eliminar', item)}>
                                                <FaTrash size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="export-align">
                    <button id="export-btn" onClick={exportToExcel}><PiMicrosoftExcelLogoFill size={20} /> Exportar a Excel</button>
                </div>
            </div>
        </section >
    );
}

export default Table;