import React, { useState, useMemo } from 'react';
import { IoArrowBackCircle } from "react-icons/io5";
import { TextField, Select, MenuItem, InputLabel, FormControl, Button, InputAdornment, FormHelperText } from '@mui/material';
import "../App.css";
import Dashboard from './Dashboard';
import { IoSaveOutline } from "react-icons/io5";
import { FaCreditCard } from "react-icons/fa6";
import { FaMoneyBill1Wave } from "react-icons/fa6";
import { FaMoneyBillTransfer } from "react-icons/fa6";
import { BsCreditCard2Front } from "react-icons/bs";
import { CiBank } from "react-icons/ci";
import { SiAmericanexpress, SiMastercard, SiVisa } from "react-icons/si";
import { CirclePicker } from 'react-color';
import { IoAddCircleOutline } from "react-icons/io5";
import { calcularCuotasRestantesCredito, calcularCuotasRestantes } from './Table';
import { IoEyeOffOutline } from "react-icons/io5";

function Modal({ data, formData, totalGastado, setFormData, mydata, setMyData, saveMyData, handleSubmit, handleDelete, handleDeleteEtiqueta, handleEdit, setModalVisible, handleCloseModal, handleChangeCierre, handleAgregarFondos, handleCreateEtiqueta, modalType }) {
  const [showSumInput, setShowSumInput] = useState(false);
  const [additionalFunds, setAdditionalFunds] = useState('');
  const [tempCierre, setTempCierre] = useState(mydata.cierre || '');
  const [showHelperText, setShowHelperText] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#fff');
  const [confirmarBorrado, setConfirmarBorrado] = useState(null);

  const formatARS = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '0,00';

    return new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value));
  };


  const getEstadoPresupuesto = (gastado, presupuesto) => {
    if (!presupuesto || presupuesto <= 0) {
      return {
        porcentaje: 0,
        color: '#9ca3af', // gris
        mensaje: 'Sin presupuesto definido'
      };
    }

    const porcentajeReal = (gastado / presupuesto) * 100;
    const porcentaje = Math.min(porcentajeReal, 100);

    // 🔴 EXCEDIDO
    if (gastado > presupuesto) {
      return {
        porcentaje,
        color: '#ef4444', // rojo
        mensaje: '⚠️ Presupuesto excedido'
      };
    }

    // 🟡 CERCA DEL LÍMITE
    if (porcentaje >= 80 && porcentaje < 100) {
      return {
        porcentaje,
        color: '#f59e0b', // amarillo
        mensaje: '⚠️ Cerca del límite'
      };
    }

    // 🟢 OK
    return {
      porcentaje,
      color: '#22c55e', // verde
      mensaje: 'En presupuesto'
    };
  };

  // guarda la etiqueta que se quiere borrar
  const calcularMontoMensual = (item) => {
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    const moneda = item.moneda?.trim() || 'ARS';
    const precio = parsePrecio(item.precio);
    if (isNaN(precio)) return null;

    // 🟢 CUOTAS RESTANTES
    const cuotasRestantes = calcularCuotasRestantesCredito(
      item.fecha,
      item.cuotas,
      mydata?.vencimiento,
      mydata?.cierre,
      mydata?.vencimientoAnterior,
      mydata?.cierreAnterior
    );

    // 🟢 GASTOS FIJOS (NO se dividen)
    if (item.isFijo) {
      if (cuotasRestantes > 0) {
        return { moneda, monto: precio };
      }
      return null;
    }

    // 🟢 CRÉDITO
    if (item.tipo === 'credito' && item.cuotas > 0) {
      if (cuotasRestantes > 0) {
        return { moneda, monto: precio / item.cuotas };
      }
      return null;
    }

    // 🟢 DÉBITO / EFECTIVO / TRANSFERENCIA
    const fechaCompra = new Date(item.fecha.split('/').reverse().join('-'));
    if (
      fechaCompra.getMonth() === mesActual &&
      fechaCompra.getFullYear() === anioActual
    ) {
      return { moneda, monto: precio };
    }

    return null;
  };



  const handleColorChange = (color) => {
    setSelectedColor(color.hex);
    setFormData({ ...formData, color: color.hex });
  };

  const ocultarEtiqueta = (etiqueta) => {
    const updated = {
      ...mydata,
      presupuestos: {
        ...mydata.presupuestos,
        [etiqueta]: {
          ...(mydata.presupuestos?.[etiqueta] || {}),
          visible: false
        }
      }
    };

    setMyData(updated);
    saveMyData(updated);
  };

  const etiquetasOcultas = mydata.etiquetas.filter(
    e => mydata.presupuestos?.[e.nombre]?.visible === false
  );
  const mostrarEtiqueta = (etiqueta) => {
    const updated = {
      ...mydata,
      presupuestos: {
        ...mydata.presupuestos,
        [etiqueta]: {
          ...(mydata.presupuestos?.[etiqueta] || {}),
          visible: true
        }
      }
    };

    setMyData(updated);
    saveMyData(updated);
  };
  const actualizarPresupuesto = (nombre, cambios) => {
    const nuevoMyData = {
      ...mydata,
      presupuestos: {
        ...mydata.presupuestos,
        [nombre]: {
          ...(mydata.presupuestos?.[nombre] || {}),
          ...cambios
        }
      }
    };

    setMyData(nuevoMyData);
    saveMyData(nuevoMyData);
  };
  const parsePrecio = (valor) => {
    if (typeof valor === 'number') return valor;

    if (!valor) return 0;

    const limpio = String(valor).trim();

    // Caso: "1234.56" → decimal punto
    if (/^\d+(\.\d+)?$/.test(limpio)) {
      return Number(limpio);
    }

    // Caso: "1.234,56" o "$1.234"
    return Number(
      limpio
        .replace(/\$/g, '')
    ) || 0;
  };

  const validateForm = () => {
    if (modalType === 'nuevo' || modalType === 'repetitivo' || modalType === 'editar') {
      return formData.objeto && formData.fecha && formData.medio && formData.precio;
    }
    if (modalType === 'fondos') {
      return mydata.fondos;
    }
    if (modalType === 'vencimiento') {
      return tempCierre;
    }
    return true;
  };
  // console.log('DATA EN MODAL:', data);

  const gastosPorEtiqueta = useMemo(() => {
    const totales = {};
    if (!Array.isArray(data)) return totales;

    data.forEach(item => {
      if (!item.etiqueta) return;

      const resultado = calcularMontoMensual(item);
      if (!resultado) return;

      const { moneda, monto } = resultado;
      const etiqueta = item.etiqueta;

      if (!totales[etiqueta]) totales[etiqueta] = {};
      if (!totales[etiqueta][moneda]) totales[etiqueta][moneda] = 0;

      totales[etiqueta][moneda] += monto;
    });

    return totales;
  }, [data, mydata]);







  const coloresPorEtiqueta = Object.fromEntries(
    (mydata.etiquetas || []).map(e => [e.nombre, e.color])
  );


  const handleSave = () => {
    if (validateForm()) {
      setShowHelperText(false);
      if (modalType === 'nuevo' || modalType === 'repetitivo') {
        handleSubmit();
      } else if (modalType === 'editar') {
        handleEdit();
      } else if (modalType === 'fondos') {
        handleAgregarFondos({ target: { value: mydata.fondos } });
      } else if (modalType === 'vencimiento') {
        handleChangeCierre({ target: { value: tempCierre } });
      } else if (modalType === 'crearEtiqueta') {
        handleCreateEtiqueta();
      }
    } else {
      setShowHelperText(true);
    }
  };

  const handleSumFunds = () => {
    const newFunds = parseFloat(mydata.fondos) + parseFloat(additionalFunds);
    setMyData({ ...mydata, fondos: newFunds });
    setAdditionalFunds('');
    setShowSumInput(false);
  };

  const handlePresupuestoChange = (etiqueta, campo, valor) => {
    const updatedMyData = {
      ...mydata,
      presupuestos: {
        ...mydata.presupuestos,
        [etiqueta]: {
          ...mydata.presupuestos?.[etiqueta],
          [campo]: valor
        }
      }
    };

    setMyData(updatedMyData);
    saveMyData(updatedMyData);
  };



  const renderCommonFields = () => (
    <>
      <TextField
        label="Objeto"
        variant="outlined"
        value={formData.objeto}
        onChange={(e) => setFormData({ ...formData, objeto: e.target.value })}
        required
        fullWidth={false}
        margin="normal"
        helperText={showHelperText && !formData.objeto ? "Ingrese el item comprado" : ""}
        sx={{
          '& .MuiOutlinedInput-root': {
            backgroundColor: formData.objeto ? '#b0ffc3' : 'white',
            '& fieldset': {
              borderColor: formData.objeto ? '#bfffce' : '#777777',
              color: '#777777',
            },
            '&:hover fieldset': {
              borderColor: formData.objeto ? '#bfffce' : '#777777',
            },
            '&.Mui-focused fieldset': {
              borderColor: formData.objeto ? '#bfffce' : '#777777',
            },
          },
          '& .MuiInputLabel-root': {
            color: 'black',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: 'black',
          },
          '& .MuiFormHelperText-root': {
            color: '#c30000',
            fontSize: '12px',
          },
        }}
      />
      <TextField
        label="Fecha de compra"
        type="date"
        variant="outlined"
        value={formData.fecha}
        onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
        required
        fullWidth={false}
        helperText={showHelperText && !formData.fecha ? "Ingrese la fecha de compra" : ""}
        margin="normal"
        InputLabelProps={{
          shrink: true,
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            backgroundColor: formData.fecha ? '#b0ffc3' : 'white',
            '& fieldset': {
              borderColor: formData.fecha ? '#bfffce' : '#777777',
              color: '#777777',
            },
            '&:hover fieldset': {
              borderColor: formData.fecha ? '#bfffce' : '#777777',
            },
            '&.Mui-focused fieldset': {
              borderColor: formData.fecha ? '#bfffce' : '#777777',
            },
          },
          '& .MuiInputLabel-root': {
            color: 'black',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: 'black',
          },
          '& .MuiFormHelperText-root': {
            color: '#c30000',
            fontSize: '12px',
          },
        }}
      />
      <FormControl variant="outlined" fullWidth={false} margin="normal" sx={{
        '& .MuiOutlinedInput-root': {
          backgroundColor: formData.medio ? '#b0ffc3' : 'white',
          '& fieldset': {
            borderColor: formData.medio ? '#bfffce' : '#777777',
            color: '#777777',
          },
          '&:hover fieldset': {
            borderColor: formData.medio ? '#bfffce' : '#777777',
          },
          '&.Mui-focused fieldset': {
            borderColor: formData.medio ? '#bfffce' : '#777777',
          },
        },
        '& .MuiInputLabel-root': {
          color: 'black',
        },
        '& .MuiInputLabel-root.Mui-focused': {
          color: 'black',
        },
      }}>
        <InputLabel>Medio de pago</InputLabel>
        <Select
          value={formData.medio}
          onChange={(e) => setFormData({ ...formData, medio: e.target.value })}
          label="Medio de pago"
          required
          startAdornment={formData.medio == 'Visa' ? <SiVisa size={25} style={{ marginRight: '5px' }} color='#575757' /> : formData.medio == 'MasterCard' ? <SiMastercard size={25} style={{ marginRight: '5px' }} color='#575757' /> : formData.medio == 'American Express' ? <SiAmericanexpress size={25} style={{ marginRight: '5px' }} color='#575757' /> : formData.medio == 'Efectivo' ? <FaMoneyBill1Wave size={25} style={{ marginRight: '5px' }} color='#575757' /> : formData.medio == 'Transferencia' ? <FaMoneyBillTransfer size={25} style={{ marginRight: '5px' }} color='#575757' /> : null}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: formData.medio ? '#b0ffc3' : 'white',
              '& fieldset': {
                borderColor: formData.medio ? '#bfffce' : '#777777',
                color: '#777777',
              },
              '&:hover fieldset': {
                borderColor: formData.medio ? '#bfffce' : '#777777',
              },
              '&.Mui-focused fieldset': {
                borderColor: formData.medio ? '#bfffce' : '#777777',
              },
            },
            '& .MuiInputLabel-root': {
              color: 'black',
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: 'black',
            },
            '& .MuiFormHelperText-root': {
              color: '#c30000',
              fontSize: '12px',
            },
          }}
        >
          <MenuItem value="Visa">Visa</MenuItem>
          <MenuItem value="MasterCard">MasterCard</MenuItem>
          <MenuItem value="American Express">American Express</MenuItem>
          <MenuItem value="Efectivo">Efectivo</MenuItem>
          <MenuItem value="Transferencia">Transferencia</MenuItem>
        </Select>
        {showHelperText && !formData.medio && (
          <FormHelperText style={{ color: '#c30000', fontSize: '12px' }}>Ingrese el medio</FormHelperText>
        )}
      </FormControl>
      <FormControl variant="outlined" fullWidth={false} margin="normal" sx={{
        '& .MuiOutlinedInput-root': {
          backgroundColor: formData.banco ? '#b0ffc3' : 'white',
          '& fieldset': {
            borderColor: formData.banco ? '#bfffce' : '#777777',
            color: '#777777',
          },
          '&:hover fieldset': {
            borderColor: formData.banco ? '#bfffce' : '#777777',
          },
          '&.Mui-focused fieldset': {
            borderColor: formData.banco ? '#bfffce' : '#777777',
          },
        },
        '& .MuiInputLabel-root': {
          color: 'black',
        },
        '& .MuiInputLabel-root.Mui-focused': {
          color: 'black',
        },
      }}>
        <InputLabel>Banco</InputLabel>
        <Select
          value={formData.banco}
          onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
          label="Banco"
          required
          startAdornment={formData.banco != '' ? <CiBank size={25} style={{ marginRight: '5px' }} color='#575757' /> : null}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: formData.banco ? '#b0ffc3' : 'white',
              '& fieldset': {
                borderColor: formData.banco ? '#bfffce' : '#777777',
                color: '#777777',
              },
              '&:hover fieldset': {
                borderColor: formData.banco ? '#bfffce' : '#777777',
              },
              '&.Mui-focused fieldset': {
                borderColor: formData.banco ? '#bfffce' : '#777777',
              },
            },
            '& .MuiInputLabel-root': {
              color: 'black',
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: 'black',
            },
            '& .MuiFormHelperText-root': {
              color: '#c30000',
              fontSize: '12px',
            },
          }}
        >
          <MenuItem value="Santander">Santander</MenuItem>
          <MenuItem value="Nacion">Nacion</MenuItem>
          <MenuItem value="Galicia">Galicia</MenuItem>
          <MenuItem value="BBVA">BBVA</MenuItem>
          <MenuItem value="Galicia Más">Galicia Más</MenuItem>
          <MenuItem value="Credicoop">Credicoop</MenuItem>
          <MenuItem value="Patagonia">Patagonia</MenuItem>
          <MenuItem value="Supervielle">Supervielle</MenuItem>
          <MenuItem value="Hipotecario">Hipotecario</MenuItem>
          <MenuItem value="Citibank">Citibank</MenuItem>
          <MenuItem value="Itaú">Itaú</MenuItem>
          <MenuItem value="ICBC">ICBC</MenuItem>
          <MenuItem value="Banco Provincia">Banco Provincia</MenuItem>
          <MenuItem value="Banco Ciudad">Banco Ciudad</MenuItem>
          <MenuItem value="Ninguno">Ninguno</MenuItem>
        </Select>
        {showHelperText && !formData.banco && (
          <FormHelperText style={{ color: '#c30000', fontSize: '12px' }}>Ingrese el banco</FormHelperText>
        )}
      </FormControl>
    </>
  );

  // Lista de monedas y símbolos
  const currencies = [
    { code: 'ARS', symbol: '$', label: 'Peso Argentino' },
    { code: 'USD', symbol: 'US$', label: 'Dólar Estadounidense' },
    { code: 'EUR', symbol: '€', label: 'Euro' },
    { code: 'BRL', symbol: 'R$', label: 'Real Brasileño' },
    { code: 'CLP', symbol: 'CLP$', label: 'Peso Chileno' },
    { code: 'UYU', symbol: 'UY$', label: 'Peso Uruguayo' },
    { code: 'GBP', symbol: '£', label: 'Libra Esterlina' },
    { code: 'JPY', symbol: '¥', label: 'Yen Japonés' },
  ];

  // Estado para la moneda seleccionada
  const [selectedCurrency, setSelectedCurrency] = useState(formData.moneda || 'ARS');

  // Actualiza la moneda en el formData y el estado local
  const handleCurrencyChange = (e) => {
    setSelectedCurrency(e.target.value);
    setFormData({ ...formData, moneda: e.target.value });
  };

  // Obtiene el símbolo de la moneda seleccionada
  const getCurrencySymbol = (code) => {
    const found = currencies.find(c => c.code === code);
    return found ? found.symbol : '$';
  };

  return (
    <div className="modal-overlay">
      <div
        id="modal-agregar"
        className="modal-content"
        style={{
          height:
            modalType === "vencimiento"
              ? "300px"
              : modalType === "fondos"
                ? "250px"
                : modalType === "eliminar"
                  ? "300px"
                  : modalType === "reporte"
                    ? "90%"
                    : modalType === "presupuesto"
                      ? "90%"
                      : modalType === "repetitivo"
                        ? "600px"
                        : modalType === "crearEtiqueta"
                          ? "500px"
                          : "500px",
          width: modalType === "reporte" || modalType === "presupuesto" ? "90%" : "400px",

          // 🎨 Fondo según tipo de modal
          background:
            modalType === "vencimiento"
              ? "linear-gradient(135deg, rgba(255, 194, 237, 0.67), rgba(228, 83, 204, 0.72))" // rosa pastel violeta
              : modalType === "fondos"
                ? "linear-gradient(135deg, rgba(173, 255, 228, 0.67), rgba(85, 242, 247, 0.72))" // celeste-menta pastel
                : modalType === "eliminar"
                  ? "linear-gradient(135deg, rgba(255, 165, 165, 0.67), rgba(255, 111, 111, 0.72))" // rojo coral pastel
                  : modalType === "reporte"
                    ? "linear-gradient(135deg, rgba(154, 129, 255, 0.67), rgba(98, 19, 255, 0.73))" // violeta pastel
                    : modalType === "presupuesto"
                      ? "linear-gradient(135deg, rgba(67, 111, 255, 0.67), rgba(19, 35, 255, 0.73))" // violeta pastel
                      : modalType === "repetitivo"
                        ? "linear-gradient(135deg, rgba(253, 232, 123, 0.8), rgba(253, 207, 82, 0.76))" // amarillo pastel
                        : modalType === "crearEtiqueta"
                          ? "linear-gradient(135deg, rgba(214, 184, 255, 0.9), rgba(157, 11, 255, 0.72))" // violeta suave
                          : "linear-gradient(135deg, rgba(175, 255, 164, 0.78), rgba(100, 255, 28, 0.72))", // default

          backdropFilter: "blur(16px) saturate(180%)",
          WebkitBackdropFilter: "blur(16px) saturate(180%)",
          borderRadius: "20px",
          border: "1px solid rgba(255, 255, 255, 0.25)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
        }}
      >

        <div className="eliminar-align">
          <span id="eliminar" className="close" onClick={() => handleCloseModal()}>
            <IoArrowBackCircle size={30} />
          </span>
        </div>
        <div className="modal-align">
          <h2>
            {modalType === 'nuevo' && 'Agregar Nuevo'}
            {modalType === 'repetitivo' && 'Agregar Repetitivo'}
            {modalType === 'fondos' && 'Agregar Fondos'}
            {modalType === 'vencimiento' && 'Cierre de Tarjeta'}
            {modalType === 'eliminar' && 'Confirmar Eliminación'}
            {modalType === 'editar' && 'Editar Registro'}
            {modalType === 'crearEtiqueta' && 'Crear Grupo'}
            {modalType === 'eliminarEtiqueta' && 'Eliminar Grupo'}
          </h2>
          <form className='formDatos' onSubmit={(e) => e.preventDefault()}>
            {(modalType === 'nuevo' || modalType === 'repetitivo' || modalType === 'editar') && (
              <>
                {renderCommonFields()}
                {(modalType === 'nuevo' || modalType === 'editar') && (
                  <>
                    {formData.medio != 'Efectivo' && formData.medio != 'Transferencia' && !(modalType === 'editar' && formData.isFijo) && (
                      <FormControl variant="outlined" fullWidth={false} margin="normal" sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: formData.tipo ? '#b0ffc3' : 'white',
                          '& fieldset': {
                            borderColor: formData.tipo ? '#bfffce' : '#777777',
                            color: '#777777',
                          },
                          '&:hover fieldset': {
                            borderColor: formData.tipo ? '#bfffce' : '#777777',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: formData.tipo ? '#bfffce' : '#777777',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: 'black',
                        },
                        '& .MuiInputLabel-root.Mui-focused': {
                          color: 'black',
                        },
                        '& .MuiFormHelperText-root': {
                          color: '#c30000',
                          fontSize: '12px',
                        },
                      }}>
                        <InputLabel>Tipo</InputLabel>
                        <Select
                          value={formData.tipo}
                          onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                          label="Tipo"
                          required
                          startAdornment={formData.tipo == 'debito' ? <BsCreditCard2Front size={25} style={{ marginRight: '5px' }} color='#575757' /> : formData.tipo == 'credito' ? <FaCreditCard size={25} style={{ marginRight: '5px' }} color='#575757' /> : null}
                        >
                          <MenuItem value="debito">Débito</MenuItem>
                          <MenuItem value="credito">Crédito</MenuItem>
                        </Select>
                        {showHelperText && !formData.tipo && (
                          <FormHelperText style={{ color: '#c30000', fontSize: '12px' }}>Ingrese el tipo</FormHelperText>
                        )}
                      </FormControl>
                    )}
                    {formData.tipo === 'credito' && (
                      <TextField
                        label="Cuotas"
                        type="number"
                        variant="outlined"
                        value={formData.cuotas}
                        onChange={(e) => setFormData({ ...formData, cuotas: e.target.value })}
                        min="1"
                        required
                        fullWidth={false}
                        margin="normal"
                        helperText={showHelperText && !formData.cuotas ? "Inngrese las cuotas" : ""}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: formData.cuotas ? '#b0ffc3' : 'white',
                            '& fieldset': {
                              borderColor: formData.cuotas ? '#bfffce' : '#777777',
                              color: '#777777',
                            },
                            '&:hover fieldset': {
                              borderColor: formData.cuotas ? '#bfffce' : '#777777',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: formData.cuotas ? '#bfffce' : '#777777',
                            },
                          },
                          '& .MuiInputLabel-root': {
                            color: 'black',
                          },
                          '& .MuiInputLabel-root.Mui-focused': {
                            color: 'black',
                          },
                          '& .MuiFormHelperText-root': {
                            color: '#c30000',
                            fontSize: '12px',
                          },
                        }}
                      />
                    )}
                  </>
                )}
                {(modalType === 'repetitivo' || formData.isFijo) && (
                  <>
                    <TextField
                      label="Rep. en el mes"
                      type="number"
                      variant="outlined"
                      value={formData.cantidad}
                      onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                      min="1"
                      required
                      fullWidth={false}
                      margin="normal"
                      helperText={showHelperText && !formData.cantidad ? "Ingrese las repeticiones en el mes" : ""}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: formData.cantidad ? '#b0ffc3' : 'white',
                          '& fieldset': {
                            borderColor: formData.cantidad ? '#bfffce' : '#777777',
                            color: '#777777',
                          },
                          '&:hover fieldset': {
                            borderColor: formData.cantidad ? '#bfffce' : '#777777',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: formData.cantidad ? '#bfffce' : '#777777',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: 'black',
                        },
                        '& .MuiInputLabel-root.Mui-focused': {
                          color: 'black',
                        },
                        '& .MuiFormHelperText-root': {
                          color: '#c30000',
                          fontSize: '12px',
                        },
                      }}
                    />
                    <TextField
                      label="Periodo en meses"
                      type="number"
                      variant="outlined"
                      value={formData.cuotas}
                      onChange={(e) => setFormData({ ...formData, cuotas: e.target.value })}
                      min="1"
                      required
                      helperText={showHelperText && !formData.cuotas ? "Ingrese la cantidad de meses" : ""}
                      fullWidth={false}
                      margin="normal"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: formData.cuotas ? '#b0ffc3' : 'white',
                          '& fieldset': {
                            borderColor: formData.cuotas ? '#bfffce' : '#777777',
                            color: '#777777',
                          },
                          '&:hover fieldset': {
                            borderColor: formData.cuotas ? '#bfffce' : '#777777',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: formData.cuotas ? '#bfffce' : '#777777',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: 'black',
                        },
                        '& .MuiInputLabel-root.Mui-focused': {
                          color: 'black',
                        },
                        '& .MuiFormHelperText-root': {
                          color: '#c30000',
                          fontSize: '12px',
                        },
                      }}
                    />
                  </>
                )}
                <FormControl variant="outlined" fullWidth={false} margin="normal" sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: selectedCurrency ? '#b0ffc3' : 'white',
                    '& fieldset': {
                      borderColor: selectedCurrency ? '#bfffce' : '#777777',
                      color: '#777777',
                    },
                    '&:hover fieldset': {
                      borderColor: selectedCurrency ? '#bfffce' : '#777777',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: selectedCurrency ? '#bfffce' : '#777777',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'black',
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: 'black',
                  },
                  '& .MuiFormHelperText-root': {
                    color: '#c30000',
                    fontSize: '12px',
                  },
                }}>
                  <InputLabel id="currency-label">Moneda</InputLabel>
                  <Select
                    labelId="currency-label"
                    value={selectedCurrency}
                    onChange={handleCurrencyChange}
                    label="Moneda"
                  >
                    {currencies.map((c) => (
                      <MenuItem key={c.code} value={c.code}>
                        {c.symbol} - {c.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Precio"
                  type="number"
                  step="0.01"
                  variant="outlined"
                  value={formData.precio}
                  onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                  min="1"
                  required
                  fullWidth={false}
                  margin="normal"
                  helperText={showHelperText && !formData.precio ? "Ingrese el precio" : ""}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        {getCurrencySymbol(selectedCurrency)}
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: formData.precio ? '#b0ffc3' : 'white',
                      '& fieldset': {
                        borderColor: formData.precio ? '#bfffce' : '#777777',
                        color: '#777777',
                      },
                      '&:hover fieldset': {
                        borderColor: formData.precio ? '#bfffce' : '#777777',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: formData.precio ? '#bfffce' : '#777777',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'black',
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: 'black',
                    },
                    '& .MuiFormHelperText-root': {
                      color: '#c30000',
                      fontSize: '12px',
                    },
                  }}
                />
              </>
            )}
            {modalType === 'fondos' && (
              <>
                <TextField
                  label="Fondos actuales"
                  type="number"
                  step="0.01"
                  variant="outlined"
                  value={mydata.fondos}
                  onChange={(e) => setMyData({ ...mydata, fondos: e.target.value })}
                  min="0"
                  required
                  fullWidth
                  margin="normal"
                  helperText={showHelperText && !mydata.fondos ? "Ingrese fondos" : ""}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: mydata.fondos ? '#b0efff' : 'white',
                      '& fieldset': {
                        borderColor: '#777777',
                        color: '#777777',
                      },
                      '&:hover fieldset': {
                        borderColor: '#555555',
                      },
                    },
                    '& .MuiFormHelperText-root': {
                      color: '#c30000',
                      fontSize: '12px',
                    },
                  }}
                />
                {!showSumInput && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setShowSumInput(!showSumInput)}
                    fullWidth
                    margin="normal"
                  >
                    Sumar fondos
                  </Button>
                )}
                {showSumInput && (
                  <>
                    <TextField
                      label="Agregar Fondos"
                      type="number"
                      step="0.01"
                      variant="outlined"
                      value={additionalFunds}
                      onChange={(e) => setAdditionalFunds(e.target.value)}
                      min="1"
                      required
                      fullWidth
                      margin="normal"
                      helperText={showHelperText && !additionalFunds ? "Ingrese los fondos a sumar" : ""}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: additionalFunds ? '#b0ffc3' : 'white',
                          '& fieldset': {
                            borderColor: '#777777',
                            color: '#777777',
                          },
                          '&:hover fieldset': {
                            borderColor: '#555555',
                          },
                        },
                        '& .MuiFormHelperText-root': {
                          color: '#c30000',
                          fontSize: '12px',
                        },
                      }}
                    />
                    <Button
                      variant="contained"
                      onClick={() => setShowSumInput(false)}
                      fullWidth
                      margin="normal"
                      sx={{
                        backgroundColor: 'grey',
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={handleSumFunds}
                      fullWidth
                      margin="normal"
                    >
                      Confirmar Suma
                    </Button>
                  </>
                )}
              </>

            )}
            {modalType === 'vencimiento' && (
              <div className="modal-align">
                {!mydata.cierre || mydata.cierre === '' || mydata.cierre < new Date().toISOString().split('T')[0] ?
                  <p style={{ color: "#ffbf00" }}>¡Atención! Es necesario agregar la fecha de cierre de tu tarjeta</p>
                  : null
                }
                <TextField
                  label="Fecha de cierre"
                  type="date"
                  variant="outlined"
                  value={tempCierre || mydata.cierre} // Usar el estado temporal o el valor actual de cierre
                  onChange={(e) => setTempCierre(e.target.value)} // Actualizar solo el estado temporal
                  required
                  fullWidth
                  helperText={showHelperText && !tempCierre ? "Ingrese la fecha de cierre" : ""}
                  margin="normal"
                  InputLabelProps={{
                    shrink: true,
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: tempCierre && tempCierre < new Date().toISOString().split('T')[0] ? '#ffcccc' : tempCierre ? '#b0ffc3' : 'white',
                      '& fieldset': {
                        borderColor: '#777777',
                        color: '#777777',
                      },
                      '&:hover fieldset': {
                        borderColor: '#777777',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#777777',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'black',
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: 'black',
                    },
                    '& .MuiFormHelperText-root': {
                      color: '#c30000',
                      fontSize: '12px',
                    },
                  }}
                />
              </div>
            )}
            {modalType === 'crearEtiqueta' && (
              <div className='etiqueta-align'>
                <TextField
                  label="Etiqueta"
                  variant="outlined"
                  value={formData.etiqueta}
                  onChange={(e) => setFormData({ ...formData, etiqueta: e.target.value })}
                  required
                  fullWidth={false}
                  margin="normal"
                  helperText={showHelperText && !formData.etiqueta ? "Ingrese el nombre de la etiqueta" : ""}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: formData.etiqueta ? '#b0ffc3' : 'white',
                      '& fieldset': {
                        borderColor: formData.etiqueta ? '#bfffce' : '#777777',
                        color: '#777777',
                      },
                      '&:hover fieldset': {
                        borderColor: formData.etiqueta ? '#bfffce' : '#777777',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: formData.etiqueta ? '#bfffce' : '#777777',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'black',
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: 'black',
                    },
                    '& .MuiFormHelperText-root': {
                      color: '#c30000',
                      fontSize: '12px',
                    },
                  }}
                />
                <h3 style={{ color: '#FFFFFF' }}>Color del Grupo</h3>
                <CirclePicker
                  color={selectedColor}
                  onChangeComplete={handleColorChange}
                  colors={["#0A1172", // Azul Profundo
                    "#0D47A1", // Azul Cobalto
                    "#1976D2", // Azul Brillante
                    "#42A5F5", // Celeste
                    "#81D4FA", // Azul Pastel
                    "#00838F", // Turquesa Oscuro
                    "#00ACC1", // Turquesa Medio
                    "#26C6DA", // Turquesa Claro
                    "#004D40", // Verde Azulado Oscuro
                    "#00796B", // Verde Esmeralda
                    "#009688", // Verde Agua
                    "#4DB6AC", // Verde Menta
                    "#8BC34A", // Verde Lima
                    "#C0CA33", // Verde Oliva Claro
                    "#FDD835", // Amarillo Dorado
                    "#FFEB3B", // Amarillo Brillante
                    "#FFC107", // Ámbar
                    "#FF9800", // Naranja Medio
                    "#FF6F00", // Naranja Intenso
                    "#E65100", // Naranja Oscuro
                    "#D84315", // Rojo Anaranjado
                    "#D32F2F", // Rojo Carmesí
                    "#C2185B", // Rojo Rubí
                    "#AD1457", // Rojo Vino
                    "#880E4F", // Borgoña
                    "#6A1B9A", // Morado Intenso
                    "#8E24AA", // Morado Vibrante
                    "#AB47BC", // Lavanda Oscura
                    "#CE93D8", // Lavanda Clara
                    "#E1BEE7"  // Lila Pastel
                  ]}
                />
              </div>
            )}
            {modalType === 'presupuesto' && (
              <div className="presupuesto-container">
                {/* ================================================= */}
                {/* 📊 RESUMEN + PRESUPUESTO MENSUAL (FULL WIDTH) */}
                {/* ================================================= */}

                {(() => {
                  const totalGastadoMes = Object.values(gastosPorEtiqueta || {}).reduce(
                    (acc, porEtiqueta) => acc + Number(porEtiqueta?.ARS || 0),
                    0
                  );

                  const totalPresupuestado = Object.entries(mydata.presupuestos || {}).reduce(
                    (acc, [_, data]) => {
                      if (data?.visible === false) return acc;
                      return acc + Number(data?.monto || 0);
                    },
                    0
                  );

                  const presupuestoMax = Number(mydata.presupuestoMensualMax || 0);

                  const { porcentaje, color, mensaje } =
                    getEstadoPresupuesto(totalGastado.ARS, presupuestoMax);

                  const excedido =
                    presupuestoMax > 0 && totalGastado.ARS > presupuestoMax;

                  return (
                    <div
                      className="presupuesto-card"
                      style={{
                        borderLeft: '6px solid #ffffff',
                        width: '100%',
                        marginBottom: 10,
                        padding: 15
                      }}
                    >
                      {/* 🧠 HEADER */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12,
                          flexWrap: 'wrap'
                        }}
                      >
                        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>
                          📊 Presupuesto mensual
                        </h1>

                        <TextField
                          label="Máximo mensual"
                          type="number"
                          size="small"
                          value={presupuestoMax || ''}
                          onChange={(e) => {
                            const updated = {
                              ...mydata,
                              presupuestoMensualMax: Number(e.target.value)
                            };
                            setMyData(updated);
                            saveMyData(updated);
                          }}
                        />
                      </div>

                      {/* 🚦 ESTADO */}
                      <p
                        className="text-sm font-medium"
                        style={{ color, marginTop: 6 }}
                      >
                        {mensaje}
                      </p>

                      {/* 💸 RESUMEN */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 12,
                          flexWrap: 'wrap',
                          marginTop: 6
                        }}
                      >
                        <p style={{ margin: 0 }}>
                          💸 Gastado: <strong>$ {formatARS(totalGastado.ARS)}</strong>
                        </p>

                        <p style={{ margin: 0 }}>
                          🏦 Presupuesto Máximo:{' '}
                          <strong>
                            $ {formatARS(presupuestoMax > 0 ? presupuestoMax : totalPresupuestado)}
                          </strong>
                        </p>

                        <p style={{ margin: 0 }}>
                          🎯 Presupuestado: <strong>$ {formatARS(totalPresupuestado)}</strong>
                        </p>

                        <p style={{ margin: 0 }}>
                          ✅ Disponible:{' '}
                          <strong>
                            $ {formatARS(
                              presupuestoMax > 0
                                ? presupuestoMax - totalGastado.ARS
                                : totalPresupuestado - totalGastado.ARS
                            )}
                          </strong>
                        </p>

                      </div>

                      {/* 📊 BARRA */}
                      <div className="barra" style={{ marginTop: 8 }}>
                        <div
                          className="barra-progreso"
                          style={{
                            width: `${porcentaje}%`,
                            background: excedido
                              ? 'linear-gradient(90deg, #e53935, #ff7043)'
                              : `linear-gradient(90deg, ${color}, ${color}aa)`
                          }}
                        />
                      </div>

                      {presupuestoMax > 0 && (
                        <small>{porcentaje.toFixed(0)}%</small>
                      )}

                      {/* 👁️ ETIQUETAS OCULTAS (EN FILA) */}
                      {etiquetasOcultas.length > 0 && (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: 8,
                            marginTop: 10,
                            alignItems: 'center'
                          }}
                        >
                          {etiquetasOcultas.map(e => (
                            <Button
                              key={e.nombre}
                              size="small"
                              startIcon={<IoAddCircleOutline />}
                              onClick={() => mostrarEtiqueta(e.nombre)}
                              color="#ffffff"
                              sx={{
                                whiteSpace: 'nowrap',
                                minWidth: 'auto'
                              }}
                            >
                              {e.nombre}
                            </Button>
                          ))}
                        </div>
                      )}

                    </div>
                  );
                })()}

                {/* ================================================= */}
                {/* 📌 PRESUPUESTOS POR ETIQUETA */}
                {/* ================================================= */}

                {mydata.etiquetas.map(et => {
                  const nombre = et.nombre;
                  const colorEtiqueta = et.color || '#ffffff';

                  const presupuestoData = mydata.presupuestos?.[nombre] || {};
                  const visible = presupuestoData.visible !== false;
                  if (!visible) return null;

                  const gastado = Number(gastosPorEtiqueta?.[nombre]?.ARS || 0);
                  const presupuesto = Number(presupuestoData.monto || 0);

                  const excedido = presupuesto > 0 && gastado > presupuesto;

                  const { porcentaje, color, mensaje } =
                    getEstadoPresupuesto(gastado, presupuesto);

                  return (
                    <div
                      key={nombre}
                      className={`presupuesto-card ${excedido ? 'excedido' : ''}`}
                      style={{ borderLeft: `5px solid ${colorEtiqueta}` }}
                    >
                      {/* 🏷️ NOMBRE */}
                      <h3
                        style={{
                          color: colorEtiqueta,
                          fontSize: '1.05rem',
                          marginBottom: 2
                        }}
                      >
                        {nombre}
                      </h3>

                      {/* 🚦 ESTADO */}
                      <p
                        style={{
                          color,
                          fontSize: '0.75rem',
                          margin: '2px 0 6px',
                          fontWeight: 600
                        }}
                      >
                        {mensaje}
                      </p>

                      {/* 💸 DATOS */}

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 12,
                          flexWrap: 'wrap',
                          marginTop: 6

                        }}
                      >
                        <p style={{ margin: 0, fontSize: '1rem' }}>
                          💸 Gastado: <strong>$ {formatARS(gastado.toFixed(2))}</strong>
                        </p>

                        <p style={{ margin: 0, fontSize: '1rem' }}>
                          🎯 Presupuestado: <strong>$ {formatARS(presupuesto || 0)}</strong>
                        </p>
                      </div>
                      {/* 📊 BARRA */}
                      <div className="barra" style={{ height: 6, marginBottom: 6 }}>
                        <div
                          className="barra-progreso"
                          style={{
                            width: `${porcentaje}%`,
                            background: excedido
                              ? 'linear-gradient(90deg, #e53935, #ff7043)'
                              : `linear-gradient(90deg, ${color}, ${color}aa)`
                          }}
                        />
                      </div>

                      {/* % */}
                      {presupuesto > 0 && (
                        <small style={{ fontSize: '0.7rem' }}>
                          {porcentaje.toFixed(0)}%
                        </small>
                      )}

                      {/* ✏️ INPUT */}
                      <TextField
                        label="Presupuesto"
                        type="number"
                        size="small"
                        value={presupuesto || ''}
                        onChange={(e) =>
                          actualizarPresupuesto(nombre, {
                            monto: Number(e.target.value),
                            visible: true
                          })
                        }
                        fullWidth
                        margin="dense"
                      />

                      {/* 👁️ OCULTAR */}
                      <Button
                        size="small"
                        color="#ffffff"
                        onClick={() => ocultarEtiqueta(nombre)}
                        startIcon={<IoEyeOffOutline />}
                      >
                        Ocultar
                      </Button>
                    </div>
                  );
                })}

              </div>
            )}


          </form>
          {modalType !== 'eliminar' && modalType !== 'reporte' && modalType !== 'presupuesto' && modalType !== 'eliminarEtiqueta' && !showSumInput && (
            <div className="alignBottom">
              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
                fullWidth
                startIcon={<IoSaveOutline />}
              >
                Guardar
              </Button>
            </div>
          )}
          {modalType === 'eliminar' && (
            <>
              <p>¿ Estás seguro de que deseas eliminar: <span style={{ color: '#c30000' }}>{formData.objeto}</span> ?</p>
              <div className="button-group">
                <Button variant="contained" color="primary" onClick={() => setModalVisible(false)}>Cancelar</Button>
                <Button variant="contained" color="error" onClick={handleDelete}>Eliminar</Button>
              </div>
            </>
          )}
          {modalType === 'eliminarEtiqueta' && (
            <>
              <p>¿ Estás seguro de que deseas eliminar: <span style={{ color: '#c30000' }}>{formData.etiqueta}</span> ?</p>
              <div className="button-group">
                <Button variant="contained" color="primary" onClick={() => setModalVisible(false)}>Cancelar</Button>
                <Button variant="contained" color="error" onClick={handleDeleteEtiqueta}>Eliminar</Button>
              </div>
            </>
          )}
          {
            modalType === 'reporte' && (
              <div>
                <Dashboard data={data} mydata={mydata} />
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}

export default Modal;