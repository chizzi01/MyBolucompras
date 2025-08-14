import React, { useState, useMemo, useEffect } from 'react';
import '../App.css';
import { TextField, Select, MenuItem, InputLabel, FormControl, Button, InputAdornment, IconButton, ListItemText } from '@mui/material';
import Papa from 'papaparse';
import { FaCheck, FaClosedCaptioning, FaEdit } from "react-icons/fa";
import { FaTrash } from "react-icons/fa";
import { PiRepeatBold } from "react-icons/pi";
import { GiReceiveMoney } from "react-icons/gi";
import { FaPiggyBank } from "react-icons/fa";
import { FaMoneyCheckDollar, FaXmark } from "react-icons/fa6";
import { IoMdAdd, IoMdTrash } from "react-icons/io";
import { FaCalendarAlt } from "react-icons/fa";
import { FaSwatchbook } from "react-icons/fa";
import { FaWallet } from "react-icons/fa";
import { PiMicrosoftExcelLogoFill } from "react-icons/pi";
import { VscArrowSwap } from "react-icons/vsc";
import { VscArrowUp } from "react-icons/vsc";
import { VscArrowDown } from "react-icons/vsc";
import { MdFilterListAlt } from "react-icons/md";
import { FiSearch } from "react-icons/fi";
import { FaChartPie } from "react-icons/fa";
import { MdLock } from 'react-icons/md';
import { FaCreditCard } from "react-icons/fa6";
import { FaMoneyBill1Wave } from "react-icons/fa6";
import { FaMoneyBillTransfer } from "react-icons/fa6";
import { BsCreditCard2Front } from "react-icons/bs";
import DeleteIcon from '@mui/icons-material/Delete';


export const calcularCuotasRestantesCredito = (fecha, cuotas, fechaVencimiento, fechaCierre, fechaVencimientoAnterior, fechaCierreAnterior) => {
    // Convertir la fecha de compra (DD/MM/YYYY) en un objeto Date
    const [dia, mes, anio] = fecha.split('/');
    const fechaCompra = new Date(`${anio}-${mes}-${dia}`);

    // Convertir las otras fechas (vencimiento, cierre, cierre anterior) en objetos Date
    const fechaVenc = new Date(fechaVencimiento);
    const fechaCierreDate = new Date(fechaCierre);
    const fechaCierreAnteriorDate = fechaCierreAnterior ? new Date(fechaCierreAnterior) : null;

    // Verificar que todas las fechas se han parseado correctamente
    if (isNaN(fechaCompra) || isNaN(fechaVenc) || isNaN(fechaCierreDate) || isNaN(fechaCierreAnteriorDate)) {
        console.error('Fecha inválida:', { fechaCompra, fechaVenc, fechaCierreDate, fechaCierreAnteriorDate });
        return 'N/A';
    }

    let cuotasRestantes;

    // Si la fecha de compra está entre el cierre anterior y el cierre actual, asignamos 0 cuotas momentáneamente
    if (fechaCompra > fechaCierreAnteriorDate && fechaCompra <= fechaCierreDate) {
        cuotasRestantes = 0;  // Se asignan 0 cuotas momentáneamente, ya que se pagará en el próximo ciclo
    } else {
        // Si la compra se realizó fuera de ese rango, calculamos las cuotas restantes
        const diferenciaMeses = (fechaVenc.getFullYear() - fechaCompra.getFullYear()) * 12 + (fechaVenc.getMonth() - fechaCompra.getMonth());
        cuotasRestantes = parseInt(cuotas, 10) - diferenciaMeses;
    }

    // Asegurarse de que no haya cuotas negativas
    return cuotasRestantes < 0 ? 0 : cuotasRestantes + 1;
};


export const calcularCuotasRestantes = (fecha, cuotas) => {
    const fechaActual = new Date();
    const [dia, mes, anio] = fecha.split('/');
    const fechaCompra = new Date(`${anio}-${mes}-${dia}`);
    const diferenciaMeses = (fechaActual.getFullYear() - fechaCompra.getFullYear()) * 12 + (fechaActual.getMonth() - fechaCompra.getMonth());
    const cuotasRestantes = parseInt(cuotas, 10) - diferenciaMeses;

    return cuotasRestantes < 0 ? 0 : cuotasRestantes;
};


function Table({ data, mydata, openModal, total, filters, uniqueBanks, uniqueMedios, uniqueEtiquetas, saveItem }) {
    if (!Array.isArray(data)) {
        return <div>No hay datos</div>;
    }
    const [showFilter, setShowFilter] = useState(false);
    const [filterCount, setFilterCount] = useState(0);
    const {
        filterObject,
        setFilterObject,
        filterType,
        setFilterType,
        filterBank,
        setFilterBank,
        filterMedio,
        setFilterMedio,
        filterEtiqueta,
        setFilterEtiqueta,
        isSwitchOn,
        handleSwitchChange,
    } = filters;

    const handleFilterClick = () => {
        setShowFilter(!showFilter);
    };

    const [labels, setLabels] = useState({});
    const [editingItemId, setEditingItemId] = useState(null);

    const handleLabelChange = (id, value) => {
        setLabels(prevLabels => {
            const newLabels = { ...prevLabels, [id]: value };
            return newLabels;
        });
        setEditingItemId(id); // Set the editing item ID to trigger useEffect
    };

    const getEtiquetaColor = (etiqueta, etiquetas) => {
        if (!Array.isArray(etiquetas)) return 'transparent';
        const etiquetaObj = etiquetas.find(e => e.nombre === etiqueta);
        return etiquetaObj ? etiquetaObj.color : 'transparent';
    };

    useEffect(() => {
        if (editingItemId !== null) {
            const etiquetaSeleccionada = labels[editingItemId];
            const item = data.find(item => item.id === editingItemId);

            if (etiquetaSeleccionada !== undefined && item && etiquetaSeleccionada !== item.etiqueta) {
                saveItem({ id: editingItemId, etiqueta: etiquetaSeleccionada });
            }
            setEditingItemId(null); // Reset the editing item ID
        }
    }, [labels, editingItemId]);

    const handleLabelConfirm = (id) => {
        setEditingItemId(id); // Trigger the useEffect
    };

    const countFilters = () => {
        let count = 0;
        if (filterObject) count++;
        if (filterType) count++;
        if (filterBank) count++;
        if (filterMedio) count++;
        if (filterEtiqueta) count++;
        setFilterCount(count);
    };

    useEffect(() => {
        countFilters();
    }, [filterObject, filterType, filterBank, filterMedio, filterEtiqueta]);

    const mesActual = new Date().toLocaleString('es-ES', { month: 'long' });

    // const [isSwitchOn, setIsSwitchOn] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'default' });

    // const handleSwitchChange = () => {
    //     setIsSwitchOn(!isSwitchOn);
    // };
    const handleSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        } else if (sortConfig.key === key && sortConfig.direction === 'descending') {
            direction = 'default';
        }
        const newSortConfig = { key, direction };
        setSortConfig(newSortConfig);
        localStorage.setItem('sortConfig', JSON.stringify(newSortConfig));
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

    // const calcularCuotasRestantes = (fecha, cuotas) => {
    //     const fechaActual = new Date();
    //     const [dia, mes, anio] = fecha.split('/');
    //     const fechaCompra = new Date(`${anio}-${mes}-${dia}`);
    //     const diferenciaMeses = (fechaActual.getFullYear() - fechaCompra.getFullYear()) * 12 + (fechaActual.getMonth() - fechaCompra.getMonth());
    //     const cuotasRestantes = parseInt(cuotas, 10) - diferenciaMeses;

    //     return cuotasRestantes < 0 ? 0 : cuotasRestantes;
    // };



    const calcularCuotas = (item) => {
        return item.tipo === 'debito'
            ? calcularCuotasRestantes(item.fecha, item.cuotas)
            : calcularCuotasRestantesCredito(item.fecha, item.cuotas, mydata.vencimiento, mydata.cierre, mydata.vencimientoAnterior, mydata.cierreAnterior);
    };

    // const filteredData = sortedData.filter(item => {
    //     return (
    //         (filterObject === '' || item.objeto.toLowerCase().includes(filterObject.toLowerCase())) &&
    //         (filterType === '' || item.tipo === filterType) &&
    //         (filterBank === '' || item.banco === filterBank) &&
    //         (filterMedio === '' || item.medio === filterMedio) &&
    //         (isSwitchOn || calcularCuotas(item) >= 1)
    //     );
    // });

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

    const isAfterCierre = (fechaCompra, fechaCierreDate, fechaCierreAnterior, medio, tipo) => {
        return (fechaCompra > fechaCierreAnterior && (fechaCompra <= fechaCierreDate || fechaCompra > fechaCierreDate)) && medio !== 'Efectivo' && medio !== 'Transferencia' && tipo === 'credito';
    };



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
                            <div className="button-text">Cierre</div>
                        </div>
                    </div>
                </div>

                <div className='dropdownFilter'>
                    <button className="dropbtnFilter" onClick={handleFilterClick}>
                        <MdFilterListAlt size={25} />
                        {filterCount > 0 && <span className="filterCount">{filterCount}</span>}
                        {filterCount > 0 && <IoMdTrash size={5} className="filterClose" onClick={() => { setFilterObject(''); setFilterType(''); setFilterBank(''); setFilterMedio(''); setFilterEtiqueta(''); }} />}

                    </button>
                    {showFilter && (
                        <div className="filter-container">
                            <div className="verticalBtn-textFilters">
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
                                            backgroundColor: filterObject ? '#5ca8ffbf' : 'transparent',
                                            fontSize: '12px',
                                            width: '100%',
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

                                        '& .MuiInputBase-input': {
                                            fontSize: '12px', // Ajusta el tamaño de la fuente
                                            padding: '10px', // Ajusta el padding
                                        },

                                    }}
                                />
                            </div>
                            <div className='selectFilters-container'>
                                <div className="verticalBtn-textFilters">
                                    <FormControl variant="outlined" fullWidth={false} margin="normal" style={{ minWidth: '90px' }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                backgroundColor: filterType ? '#5ca8ffbf' : 'transparent',
                                                fontSize: '12px',
                                                maxWidth: '100px',
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
                                        <InputLabel
                                            sx={{
                                                '&.MuiInputLabel-root': {
                                                    fontSize: '12px', // Ajusta el tamaño de la fuente
                                                    top: '-5px', // Ajusta la posición de la etiqueta
                                                },
                                                '&.MuiInputLabel-root.Mui-focused': {
                                                    fontSize: '12px', // Ajusta el tamaño de la fuente
                                                },
                                            }}
                                        >Tipo</InputLabel>
                                        <Select
                                            value={filterType}
                                            onChange={(e) => setFilterType(e.target.value)}
                                            label="Tipo"
                                            sx={{
                                                '& .MuiSelect-select': {
                                                    fontSize: '12px', // Ajusta el tamaño de la fuente
                                                    padding: '10px', // Ajusta el padding
                                                    maxWidth: '100px', // Ajusta el ancho máximo
                                                },
                                            }}
                                        >
                                            <MenuItem value=""><em>None</em></MenuItem>
                                            <MenuItem value="debito">Débito</MenuItem>
                                            <MenuItem value="credito">Crédito</MenuItem>
                                        </Select>
                                    </FormControl>
                                </div>
                                <div className="verticalBtn-textFilters">
                                    <FormControl variant="outlined" fullWidth margin="normal" style={{ minWidth: '90px' }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                backgroundColor: filterBank ? '#5ca8ffbf' : 'transparent',
                                                fontSize: '12px',
                                                maxWidth: '100px',
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
                                        <InputLabel
                                            sx={{
                                                '&.MuiInputLabel-root': {
                                                    fontSize: '12px', // Ajusta el tamaño de la fuente
                                                    top: '-5px', // Ajusta la posición de la etiqueta
                                                },
                                                '&.MuiInputLabel-root.Mui-focused': {
                                                    fontSize: '12px', // Ajusta el tamaño de la fuente
                                                },
                                            }}
                                        >Banco</InputLabel>
                                        <Select
                                            value={filterBank}
                                            onChange={(e) => setFilterBank(e.target.value)}
                                            label="Banco"
                                            sx={{
                                                '& .MuiSelect-select': {
                                                    fontSize: '12px', // Ajusta el tamaño de la fuente
                                                    padding: '10px', // Ajusta el padding
                                                    maxWidth: '100px', // Ajusta el ancho máximo
                                                },
                                            }}
                                        >
                                            <MenuItem value=""><em>None</em></MenuItem>
                                            {uniqueBanks?.map((bank, index) => (
                                                <MenuItem key={index} value={bank}>{bank}</MenuItem>
                                            ))}

                                        </Select>
                                    </FormControl>
                                </div>
                                <div className="verticalBtn-textFilters">
                                    <FormControl variant="outlined" fullWidth margin="normal" style={{ minWidth: '90px' }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                backgroundColor: filterMedio ? '#5ca8ffbf' : 'transparent',
                                                fontSize: '12px',
                                                maxWidth: '100px',
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
                                        <InputLabel
                                            sx={{
                                                '&.MuiInputLabel-root': {
                                                    fontSize: '12px', // Ajusta el tamaño de la fuente
                                                    top: '-5px', // Ajusta la posición de la etiqueta
                                                },
                                                '&.MuiInputLabel-root.Mui-focused': {
                                                    fontSize: '12px', // Ajusta el tamaño de la fuente
                                                },
                                            }}
                                        >Medio</InputLabel>
                                        <Select
                                            value={filterMedio}
                                            onChange={(e) => setFilterMedio(e.target.value)}
                                            label="Medio"
                                            sx={{
                                                '& .MuiSelect-select': {
                                                    fontSize: '12px', // Ajusta el tamaño de la fuente
                                                    padding: '10px', // Ajusta el padding
                                                    maxWidth: '100px', // Ajusta el ancho máximo
                                                },
                                            }}
                                        >
                                            <MenuItem value=""><em>None</em></MenuItem>
                                            {uniqueMedios?.map((medio, index) => (
                                                <MenuItem key={index} value={medio}>{medio}</MenuItem>
                                            ))}

                                        </Select>
                                    </FormControl>
                                </div>
                                <div className="verticalBtn-textFilters">
                                    <FormControl variant="outlined" fullWidth margin="normal" style={{ minWidth: '90px' }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                backgroundColor: filterEtiqueta ? '#5ca8ffbf' : 'transparent',
                                                fontSize: '12px',
                                                maxWidth: '100px',
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
                                        <InputLabel
                                            sx={{
                                                '&.MuiInputLabel-root': {
                                                    fontSize: '12px', // Ajusta el tamaño de la fuente
                                                    top: '-5px', // Ajusta la posición de la etiqueta
                                                },
                                                '&.MuiInputLabel-root.Mui-focused': {
                                                    fontSize: '12px', // Ajusta el tamaño de la fuente
                                                },
                                            }}
                                        >Grupo</InputLabel>
                                        <Select
                                            value={filterEtiqueta}
                                            onChange={(e) => setFilterEtiqueta(e.target.value)}
                                            label="Etiqueta"
                                            sx={{
                                                '& .MuiSelect-select': {
                                                    fontSize: '12px', // Ajusta el tamaño de la fuente
                                                    padding: '10px', // Ajusta el padding
                                                    maxWidth: '100px', // Ajusta el ancho máximo
                                                },
                                            }}
                                        >
                                            <MenuItem value=""><em>None</em></MenuItem>
                                            {uniqueEtiquetas?.map((etiqueta, index) => (
                                                <MenuItem key={index} value={etiqueta}>{etiqueta}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="fondosAlign">
                    <h2 id="fondos"><FaWallet size={20} /> Fondos: <span style={{ color: "#FFB63F" }}>${parseFloat((mydata.fondos || 0) - total).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></h2>
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
                                <th onClick={() => handleSort('etiqueta')}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                        Grupo {sortConfig.key === 'etiqueta' ? (sortConfig.direction === 'ascending' ? <VscArrowUp /> : sortConfig.direction === 'descending' ? <VscArrowDown /> : <VscArrowSwap />) : <VscArrowSwap />}
                                    </div>
                                </th>
                                {/* <th>Grupo</th> */}
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {sortedData.map((item, index) => {
                                const fechaCompra = new Date(item.fecha.split('/').reverse().join('-'));
                                const fechaCierreDate = new Date(mydata.cierre);
                                const fechaCierreAnteriorDate = new Date(mydata.cierreAnterior);
                                const medio = item.medio;
                                const tipo = item.tipo;
                                const showModal = isAfterCierre(fechaCompra, fechaCierreDate, fechaCierreAnteriorDate, medio, tipo);

                                return (
                                    <tr key={index} style={{ position: 'relative' }}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
                                                {item.objeto}
                                                {item.isFijo && <PiRepeatBold size={15} color='#ff9a15' />}
                                                {item.tipo === 'credito' && <FaCreditCard size={15} color='#3181ff' />}
                                                {item.tipo === 'debito' && item.isFijo == false && item.medio == 'Efectivo' && <FaMoneyBill1Wave size={15} color='#11af00' />}
                                                {item.tipo === 'debito' && item.isFijo == false && item.medio == 'Transferencia' && <FaMoneyBillTransfer size={15} color='#e773d4' />}
                                                {item.tipo === 'debito' && item.isFijo == false && (item.medio != 'Transferencia' && item.medio != 'Efectivo') && <BsCreditCard2Front size={15} color='#11af00' />}
                                            </div>
                                        </td>
                                        <td>{item.fecha}</td>
                                        <td>{item.medio}</td>
                                        <td>{isNaN(calcularCuotas(item)) ? 'N/A' : calcularCuotas(item)}</td>
                                        <td>{item.banco}</td>
                                        <td>{item.cantidad}</td>
                                        <td>$  {item.precio && typeof item.precio === 'string'
                                            ? item.isFijo
                                                ? parseFloat(item.precio.replace('$', '')).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                : parseFloat(item.precio.replace('$', '') / item.cuotas).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                            : 'N/A'}

                                        </td>
                                        <td>
                                            <FormControl variant="outlined" fullWidth margin="normal" style={{ minWidth: '90px', maxWidth: '100px', maxHeight: '50px', zIndex: 10, backgroundColor: getEtiquetaColor(item.etiqueta, mydata.etiquetas), borderRadius: '5px' }} >
                                                <Select
                                                    value={labels[item.id] || item.etiqueta || ''}
                                                    onChange={(e) => {
                                                        handleLabelChange(item.id, e.target.value);
                                                        handleLabelConfirm(item.id);
                                                    }}
                                                    autoWidth
                                                    displayEmpty
                                                    style={{
                                                        fontSize: '12px',
                                                    }}
                                                    sx={{
                                                        '& .MuiOutlinedInput-root': {
                                                            fontSize: '12px',
                                                            maxWidth: '100px',
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
                                                        '& .MuiFormHelperText-root': {
                                                            color: '#c30000',
                                                            fontSize: '10px',
                                                        },
                                                        '& .MuiSelect-select': {
                                                            fontSize: '12px', // Ajusta el tamaño de la fuente
                                                            padding: '2px', // Ajusta el padding
                                                            maxWidth: '100px', // Ajusta el ancho máximo
                                                            maxHeight: '25px',

                                                        },
                                                    }}
                                                >
                                                    <MenuItem value=""><em>None</em></MenuItem>
                                                    {[...new Set(mydata.etiquetas.map(e => e.nombre))].map((etiqueta, index) => (
                                                        <MenuItem key={index} value={etiqueta}>
                                                            <ListItemText primary={etiqueta} sx={{
                                                                '& .MuiListItemText-primary': {
                                                                    fontSize: '11px',
                                                                    padding: '0px',
                                                                    margin: '0px',
                                                                },
                                                            }} />
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => openModal('eliminarEtiqueta', item, etiqueta)}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </MenuItem>
                                                    ))}
                                                    <MenuItem>
                                                        <Button onClick={() => openModal('crearEtiqueta', item)}>
                                                            Crear Grupo
                                                        </Button>
                                                    </MenuItem>
                                                </Select>
                                            </FormControl>
                                        </td>
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
                                        {showModal && (
                                            <div style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                zIndex: 1,
                                                backdropFilter: 'blur(1px)',
                                                border: '1px solid #8C52FF',
                                            }}>
                                                <MdLock size={20} color='#8C52FF' />
                                                <span>Entra para el próximo mes 🎉</span>
                                            </div>
                                        )}
                                    </tr>
                                );
                            })}
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