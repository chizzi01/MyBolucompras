import React, { useState, useMemo, useEffect, useRef } from 'react';
import '../App.css';
import { parseFecha, parsePrecio } from '../utils/formatters';
import { TextField, Select, MenuItem, InputLabel, FormControl, Button, InputAdornment, IconButton, ListItemText } from '@mui/material';
import Papa from 'papaparse';
import { FaCheck, FaClosedCaptioning, FaEdit } from "react-icons/fa";
import { FaTrash } from "react-icons/fa";
import { PiRepeatBold } from "react-icons/pi";
import { GiReceiveMoney } from "react-icons/gi";
import { FaPiggyBank } from "react-icons/fa";
import { FaMoneyCheckDollar, FaXmark } from "react-icons/fa6";
import { IoMdAdd, IoMdTrash } from "react-icons/io";
import { IoPeopleOutline } from "react-icons/io5";
import { FaCalendarAlt } from "react-icons/fa";
import { FaSwatchbook } from "react-icons/fa";
import { FaWallet } from "react-icons/fa";
import { PiMicrosoftExcelLogoFill } from "react-icons/pi";
import { VscArrowSwap } from "react-icons/vsc";
import { VscArrowUp } from "react-icons/vsc";
import { VscArrowDown } from "react-icons/vsc";
import { MdFilterListAlt } from "react-icons/md";
import { FiSearch } from "react-icons/fi";
import { MdLock } from 'react-icons/md';
import { FaCreditCard } from "react-icons/fa6";
import { FaMoneyBill1Wave } from "react-icons/fa6";
import { FaMoneyBillTransfer } from "react-icons/fa6";
import { BsCreditCard2Front } from "react-icons/bs";
import DeleteIcon from '@mui/icons-material/Delete';


import { calcularCuotasRestantesCredito, calcularCuotasRestantes } from '../utils/cuotas';
export { calcularCuotasRestantesCredito, calcularCuotasRestantes };


function Table({ data, mydata, openModal, total, filters, uniqueBanks, uniqueMedios, uniqueEtiquetas, saveItem, uniqueMonedas }) {
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
        filterMoneda,
        setFilterMoneda,
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
        if (filterType) count++;
        if (filterBank) count++;
        if (filterMedio) count++;
        if (filterEtiqueta) count++;
        if (filterMoneda) count++;
        setFilterCount(count);
    };

    useEffect(() => {
        countFilters();
    }, [filterType, filterBank, filterMedio, filterEtiqueta, filterMoneda]);

    const ahora = new Date();
    const mesActual = ahora.toLocaleString('es-ES', { month: 'long' });
    const mesCapitalizado = mesActual.charAt(0).toUpperCase() + mesActual.slice(1);
    const añoActual = ahora.getFullYear();

    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'default' });
    const [showAgregarMenu, setShowAgregarMenu] = useState(false);
    const agregarMenuRef = useRef(null);

    useEffect(() => {
      const handler = (e) => {
        if (agregarMenuRef.current && !agregarMenuRef.current.contains(e.target)) {
          setShowAgregarMenu(false);
        }
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, []);

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
        if (sortConfig.key === null || sortConfig.direction === 'default') return [...data];

        // Pre-procesar la clave de ordenamiento una sola vez por fila — O(n)
        const parsed = data.map(item => {
            let key = item[sortConfig.key];
            if (sortConfig.key === 'fecha') key = parseFecha(item.fecha).getTime();
            if (sortConfig.key === 'precio') key = parsePrecio(item.precio);
            return { item, key };
        });

        parsed.sort((a, b) => {
            if (a.key < b.key) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (a.key > b.key) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });

        return parsed.map(p => p.item);
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

    const filteredData = useMemo(() => sortedData.filter(item => {
        if (!isSwitchOn) {
            const fecha = parseFecha(item.fecha);
            const now = new Date();
            if (fecha.getFullYear() !== now.getFullYear() || fecha.getMonth() !== now.getMonth()) return false;
        }
        return true;
    }), [sortedData, isSwitchOn]);

    const exportToExcel = () => {
        const rows = sortedData.map(item => {
            const cr = calcularCuotas(item);
            return {
                Objeto: item.objeto,
                Fecha: item.fecha,
                Tipo: item.isFijo ? 'Fijo' : item.tipo,
                Medio: item.medio,
                Banco: item.banco || '',
                Cuotas: item.cuotas,
                'Cuotas restantes': isNaN(cr) ? 'N/A' : cr,
                Cantidad: item.cantidad,
                Precio: parsePrecio(item.precio).toFixed(2),
                Moneda: item.moneda || 'ARS',
                Etiqueta: item.etiqueta || '',
            };
        });

        // BOM (﻿) para que Excel en Windows abra correctamente acentos y ñ
        const csv = Papa.unparse(rows, { header: true, delimiter: ';' });
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'BudgetBuddy.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    };

    const isAfterCierre = (fechaCompra, fechaCierreDate, fechaCierreAnterior, medio, tipo) => {
        return (fechaCompra > fechaCierreAnterior && (fechaCompra <= fechaCierreDate || fechaCompra > fechaCierreDate)) && medio !== 'Efectivo' && medio !== 'Transferencia' && tipo === 'credito';
    };



    return (
        <section id="gastos" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="componentContainer">
                <div style={{ display: 'flex', alignItems: 'center', padding: '6px 16px 10px', gap: '10px', position: 'relative' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                        <button className="dropbtnFilter" onClick={handleFilterClick} style={{ width: 36, height: 36, margin: 0, padding: 0, borderRadius: '10px', boxSizing: 'border-box' }}>
                            <MdFilterListAlt size={17} />
                            {filterCount > 0 && <span className="filterCount">{filterCount}</span>}
                            {filterCount > 0 && <IoMdTrash size={5} className="filterClose" onClick={() => { setFilterType(''); setFilterBank(''); setFilterMedio(''); setFilterEtiqueta(''); setFilterMoneda('') }} />}
                        </button>
                    {showFilter && (
                        <div className="filter-container" style={{ position: 'absolute', top: '50%', left: 290, transform: 'translateY(-50%)', zIndex: 200 }}>
                            <div className='selectFilters-container'>
                                <div className="verticalBtn-textFilters">
                                    <FormControl variant="outlined" fullWidth={false} margin="normal" style={{ minWidth: '90px' }}
                                        className="glass-filter-input"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                backgroundColor: filterType ? '#5ca8ffbf' : 'transparent',
                                                fontSize: '12px',
                                                maxWidth: '90px',
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
                                                    maxWidth: '90px',
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
                                        className="glass-filter-input"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                backgroundColor: filterBank ? '#5ca8ffbf' : 'transparent',
                                                fontSize: '12px',
                                                maxWidth: '90px',
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
                                                    maxWidth: '90px',
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
                                        className="glass-filter-input"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                backgroundColor: filterMedio ? '#5ca8ffbf' : 'transparent',
                                                fontSize: '12px',
                                                maxWidth: '90px',
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
                                                    maxWidth: '90px', // Ajusta el ancho máximo
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
                                        className="glass-filter-input"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                backgroundColor: filterEtiqueta ? '#5ca8ffbf' : 'transparent',
                                                fontSize: '12px',
                                                maxWidth: '90px',
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
                                        >Moneda</InputLabel>
                                        <Select
                                            value={filterMoneda}
                                            onChange={(e) => setFilterMoneda(e.target.value)}
                                            label="Moneda"
                                            sx={{
                                                '& .MuiSelect-select': {
                                                    fontSize: '12px', // Ajusta el tamaño de la fuente
                                                    padding: '10px', // Ajusta el padding
                                                    maxWidth: '100px', // Ajusta el ancho máximo
                                                },
                                            }}
                                        >
                                            <MenuItem value=""><em>None</em></MenuItem>
                                            {uniqueMonedas?.map((moneda, index) => (
                                                <MenuItem key={index} value={moneda}>{moneda}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </div>
                                <div className="verticalBtn-textFilters">
                                    <FormControl variant="outlined" fullWidth margin="normal" style={{ minWidth: '90px' }}
                                        className="glass-filter-input"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                backgroundColor: filterEtiqueta ? '#5ca8ffbf' : 'transparent',
                                                fontSize: '12px',
                                                maxWidth: '90px',
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
                                                    maxWidth: '90px', // Ajusta el ancho máximo
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
                        <div style={{ position: 'relative', width: '260px' }}>
                            <FiSearch size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }} />
                            <input
                                type="text"
                                placeholder="Buscar gasto..."
                                value={filterObject}
                                onChange={(e) => setFilterObject(e.target.value)}
                                style={{ width: '100%', padding: '7px 12px 7px 34px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '100px', color: 'white', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>
                    <div style={{ flex: 1 }} />
                    <label className="switch-label" style={{ flexShrink: 0, gap: '14px', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: !isSwitchOn ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)', fontWeight: !isSwitchOn ? 700 : 400, transition: 'all 0.2s' }}>
                            <FaCalendarAlt size={16} />
                            {mesCapitalizado}
                        </span>
                        <div className={`switch-track ${isSwitchOn ? 'on' : ''}`} onClick={handleSwitchChange} style={{ width: 46, height: 26 }}>
                            <div className="switch-thumb" style={{ width: 18, height: 18, top: 4, left: isSwitchOn ? 24 : 4 }} />
                        </div>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: isSwitchOn ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)', fontWeight: isSwitchOn ? 700 : 400, transition: 'all 0.2s' }}>
                            <FaSwatchbook size={16} />
                            Todas
                        </span>
                    </label>
                    <div style={{ flex: 1 }} />
                    <div className="agregar-split-btn" ref={agregarMenuRef}>
                        <div className="agregar-split-inner">
                            <button className="agregar-main" onClick={() => openModal('nuevo')}>
                                <IoMdAdd size={16} /> Agregar
                            </button>
                            <button className="agregar-arrow" onClick={() => setShowAgregarMenu(m => !m)}>
                                ▾
                            </button>
                        </div>
                        {showAgregarMenu && (
                            <div className="agregar-dropdown">
                                <button onClick={() => { openModal('nuevo'); setShowAgregarMenu(false); }}>
                                    <GiReceiveMoney size={16} style={{ color: '#73e786' }} /> Nuevo gasto
                                </button>
                                <button onClick={() => { openModal('repetitivo'); setShowAgregarMenu(false); }}>
                                    <PiRepeatBold size={16} style={{ color: '#ffc170' }} /> Gasto fijo
                                </button>
                                <button onClick={() => { openModal('fondos'); setShowAgregarMenu(false); }}>
                                    <FaPiggyBank size={16} style={{ color: '#55f1f7' }} /> Agregar fondos
                                </button>
                                <button onClick={() => { openModal('vencimiento'); setShowAgregarMenu(false); }}>
                                    <FaMoneyCheckDollar size={16} style={{ color: '#e773d4' }} /> Actualizar cierre
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div class="fondosAlign">
                    <h2 class="fondosTitulo">
                        <FaWallet size={20} />
                        Fondos:
                        <span class="fondosMonto">
                            $
                            {parseFloat(
                                (mydata.fondos || 0) -
                                (typeof total === 'object'
                                    ? Number(total.ARS || 0)
                                    : Number(total))
                            ).toLocaleString('es-ES', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}
                        </span>
                    </h2>
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
                            {filteredData.map((item, index) => {
                                const fechaCompra = new Date(item.fecha.split('/').reverse().join('-'));
                                const fechaCierreDate = new Date(mydata.cierre);
                                const fechaCierreAnteriorDate = new Date(mydata.cierreAnterior);
                                const medio = item.medio;
                                const tipo = item.tipo;
                                const showModal = isAfterCierre(fechaCompra, fechaCierreDate, fechaCierreAnteriorDate, medio, tipo);

                                return (
                                    <tr key={index} style={{ position: 'relative' }}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                {item.objeto}
                                                {item.isFijo && <PiRepeatBold size={15} color='#ff9a15' />}
                                                {item.tipo === 'credito' && <FaCreditCard size={15} color='#3181ff' />}
                                                {item.tipo === 'debito' && item.isFijo == false && item.medio == 'Efectivo' && <FaMoneyBill1Wave size={15} color='#11af00' />}
                                                {item.isFijo == false && item.medio == 'Transferencia' && <FaMoneyBillTransfer size={15} color='#e773d4' />}
                                                {item.tipo === 'debito' && item.isFijo == false && (item.medio != 'Transferencia' && item.medio != 'Efectivo') && <BsCreditCard2Front size={15} color='#11af00' />}
                                                {item.compartidoConNombre && (
                                                    <span className="shared-badge">
                                                        <IoPeopleOutline size={11} />
                                                        {item.compartidoConNombre}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td>{item.fecha}</td>
                                        <td>{item.medio}</td>
                                        <td>{isNaN(calcularCuotas(item)) ? 'N/A' : calcularCuotas(item)}</td>
                                        <td>{item.banco}</td>
                                        <td>{item.cantidad}</td>
                                        <td>
                                            {(() => {
                                                let symbol = '$';
                                                if (item.moneda === 'USD') symbol = 'US$';
                                                else if (item.moneda === 'EUR') symbol = '€';
                                                else if (item.moneda === 'BRL') symbol = 'R$';
                                                else if (item.moneda === 'ARS') symbol = '$';
                                                else if (item.moneda === 'GBP') symbol = '£';
                                                else if (item.moneda === 'CLP') symbol = 'CLP$';
                                                else if (item.moneda === 'UYU') symbol = 'UY$';
                                                else if (item.moneda === 'JPY') symbol = '¥';
                                                if (item.precio && typeof item.precio === 'string') {
                                                    const precioNum = parseFloat(item.precio.replace('$', ''));
                                                    const valor = item.isFijo
                                                        ? precioNum
                                                        : precioNum / item.cuotas;
                                                    return (
                                                        <span>
                                                            {symbol} {valor.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                    );
                                                } else {
                                                    return 'N/A';
                                                }
                                            })()}
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
                                                        color: (labels[item.id] || item.etiqueta) ? 'white' : 'black',
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
                                                            fontSize: '12px',
                                                            padding: '2px',
                                                            maxWidth: '100px',
                                                            maxHeight: '25px',
                                                        },
                                                    }}
                                                >
                                                    <MenuItem value=""><em>None</em></MenuItem>
                                                    {[...new Set((mydata?.etiquetas || []).map(e => e?.nombre).filter(Boolean))].map((etiqueta, index) => (
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
                                                backgroundColor: 'rgba(224, 224, 224, 0.7)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                zIndex: 1,
                                                backdropFilter: 'blur(2px)',
                                                border: '1px solid #8C52FF',
                                            }}>
                                                <MdLock size={20} color='#4700d6ff' />
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