import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Table, { calcularCuotasRestantesCredito } from './components/Table';
import Modal from './components/Modal';
import Header from './components/Navbar';
import Footer from './components/Footer';
import Preguntas from './components/Preguntas';
import { FaCalculator } from "react-icons/fa6";

function App() {
  const [data, setData] = useState([]);
  const [mydata, setMyData] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('');
  const [formData, setFormData] = useState({
    objeto: '',
    fecha: '',
    medio: '',
    cuotas: 1,
    tipo: 'debito',
    banco: '',
    cantidad: 1,
    precio: ''
  });

  useEffect(() => {
    // Cargar datos desde los archivos JSON
    const fetchData = async () => {
      try {
        const response = await window.electron.readData('data');
        const myResponse = await window.electron.readData('misdatos');
        setData(response);
        setMyData(myResponse);
        if (!myResponse.cierre || new Date(myResponse.cierre) < new Date()) {
          openModal('vencimiento');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);


  const agregarDatosObjeto = (id, objeto, fecha, medio, cuotas, tipo, banco, cantidad, precio) => {
    const NuevoObjeto = {
      id: id,
      isFijo: false,
      objeto: objeto.charAt(0).toUpperCase() + objeto.slice(1),
      fecha: fecha.split("-").reverse().join("/"),
      medio: medio,
      cuotas: tipo === 'debito' ? 1 : Number(cuotas),
      tipo: (medio === 'Efectivo' || medio==='Transferencia') ? 'debito' : tipo,
      banco: banco,
      cantidad: Number(cantidad),
      precio: isNaN(Number(precio)) || !isFinite(Number(precio)) ? "$ 0" : `$ ${Number(precio).toFixed(2)}`
    };

    const updatedData = [...data, NuevoObjeto];
    setData(updatedData);
    saveData(updatedData);
  };

  const agregarDatosObjetoFijo = (id, objeto, fecha, medio, cuotas, banco, cantidad, precio) => {
    const precioTotal = Number(precio) * Number(cantidad);
    const NuevoObjeto = {
      id: id,
      isFijo: true,
      objeto: objeto.charAt(0).toUpperCase() + objeto.slice(1),
      fecha: fecha.split("-").reverse().join("/"),
      medio: medio,
      cuotas: Number(cuotas),
      tipo: "debito",
      banco: banco,
      cantidad: Number(cantidad),
      precio: isNaN(precioTotal) || !isFinite(precioTotal) ? "$ 0" : `$ ${precioTotal.toFixed(2)}`
    };

    const updatedData = [...data, NuevoObjeto];
    setData(updatedData);
    saveData(updatedData);
  };

  const saveData = async (updatedData) => {
    try {
      await window.electron.writeData('data', updatedData);
      console.log('Data saved');
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const saveMyData = async (updatedMyData) => {
    try {
      await window.electron.writeData('misdatos', updatedMyData);
      console.log('MyData saved');
    } catch (error) {
      console.error('Error saving mydata:', error);
    }
  };

  const handleSubmit = () => {
    const id = generateUniqueId();
    if (modalType === 'repetitivo') {
      agregarDatosObjetoFijo(id, formData.objeto, formData.fecha, formData.medio, formData.cuotas, formData.banco, formData.cantidad, formData.precio);
    } else {
      agregarDatosObjeto(id, formData.objeto, formData.fecha, formData.medio, formData.cuotas, formData.tipo, formData.banco, formData.cantidad, formData.precio);
    }
    setModalVisible(false);
    setFormData({ objeto: '', fecha: '', medio: '', cuotas: 1, tipo: '', banco: '', cantidad: 1, precio: '' });
  };

  const handleDelete = () => {
    const updatedData = data.filter(item => item.id !== formData.id);
    setData(updatedData);
    saveData(updatedData);
    setModalVisible(false);
  };

  const handleEdit = () => {
    const updatedData = data.map(item =>
      item.id === formData.id
        ? {
          ...formData, fecha: formData.fecha.split('-').reverse().join('/'),
          precio: item.isFijo ? `$ ${parseFloat(formData.precio).toFixed(2) * item.cantidad}` : `$ ${parseFloat(formData.precio).toFixed(2)}`
        }
        : item
    );
    setData(updatedData);
    saveData(updatedData);
    setModalVisible(false);
  };
  const handleChangeCierre = (event) => {
    const { value } = event.target; // Nuevo valor de cierre
    const cierreDate = new Date(value);
    let vencimientoDate = new Date(cierreDate);
    vencimientoDate.setDate(vencimientoDate.getDate() + 10);
  
    // Ajustar vencimientoDate si cae en fin de semana
    while (vencimientoDate.getDay() === 0 || vencimientoDate.getDay() === 5) {
      vencimientoDate.setDate(vencimientoDate.getDate() + 1);
    }
  
    const vencimientoFormatted = vencimientoDate.toISOString().split('T')[0];
  
    // Capturamos explícitamente el valor actual de cierre antes de actualizarlo
    const cierreAnterior = new Date(cierreDate);
    cierreAnterior.setMonth(cierreAnterior.getMonth() - 1);
  
    // Ajustar cierreAnterior si cae en fin de semana
    while (cierreAnterior.getDay() === 0 || cierreAnterior.getDay() === 5) {
      cierreAnterior.setDate(cierreAnterior.getDate() - 1);
    }
  
    const cierreAnteriorFormatted = cierreAnterior.toISOString().split('T')[0];
  
    // Actualizamos el estado con los valores correctos
    const updatedMyData = {
      ...mydata,
      cierreAnterior: cierreAnteriorFormatted, // Guardamos el valor anterior capturado
      vencimientoAnterior: mydata.vencimiento || vencimientoFormatted,
      cierre: value, // Nuevo valor de cierre
      vencimiento: vencimientoFormatted, // Nuevo valor de vencimiento
    };
  
    setMyData(updatedMyData);
    saveMyData(updatedMyData);
    setModalVisible(false); // Cerrar el modal
  };




  const handleAgregarFondos = (event) => {
    const { value } = event.target;
    const updatedMyData = { ...mydata, fondos: Number(value) };
    setMyData(updatedMyData);
    saveMyData(updatedMyData);
    setModalVisible(false);
  };


  const generateUniqueId = () => {
    return Math.floor(Math.random() * 1000000);
  };

  const openModal = useCallback((type, item = {}) => {
    setFormData({ objeto: '', fecha: '', medio: '', cuotas: 1, tipo: '', banco: '', cantidad: 1, precio: '' });
    setModalType(type);
    if (type === 'eliminar' || type === 'editar') {
      const formattedItem = {
        ...item,
        fecha: item.fecha.split('/').reverse().join('-'), // Formatea la fecha a yyyy-mm-dd
        precio: item.isFijo ? (parseFloat(item.precio.replace('$', '').trim())).toFixed(2) / item.cantidad : item.precio.replace('$', '').trim(), // Elimina el símbolo de dólar y los espacios en blanco
        cuotas: item.tipo === 'debito' ? 1 : Number(item.cuotas)
      };
      setFormData(formattedItem);
    }
    setModalVisible(true);
  }, []);

  const handleCloseModal = () => {
    setModalVisible(false);
    setFormData({ objeto: '', fecha: '', medio: '', cuotas: 1, tipo: '', banco: '', cantidad: 1, precio: '' });
  }

  const totalGastado = () => {
    let total = 0;

    data.forEach((item) => {

      let precioMensual = 0;
      if (item.precio && typeof item.precio === 'string') {
        precioMensual = parseFloat(item.precio.replace('$', '').trim()) / item.cuotas;
      }

      if (item.cuotas > 0) {
        const cuotasRestantes = calcularCuotasRestantesCredito(item.fecha, item.cuotas, mydata.vencimiento, mydata.cierre, mydata.vencimientoAnterior, mydata.cierreAnterior);

        if (cuotasRestantes > 0 || item.isFijo || item.medio === 'Efectivo') {
          total += precioMensual;
        }
      }
    });
    return total.toFixed(2);
  };



  const bancoMasUsado = () => {
    const bancos = {};
    data.forEach((item) => {
      if (bancos[item.banco]) {
        bancos[item.banco]++;
      } else {
        bancos[item.banco] = 1;
      }
    });

    const max = Math.max(...Object.values(bancos));
    return Object.keys(bancos).find((key) => bancos[key] === max);
  }

  const tarjetaMasUsada = () => {
    const tarjetas = {};
    data.forEach((item) => {
      if (tarjetas[item.medio]) {
        tarjetas[item.medio]++;
      } else {
        tarjetas[item.medio] = 1;
      }
    });

    const max = Math.max(...Object.values(tarjetas));
    return Object.keys(tarjetas).find((key) => tarjetas[key] === max);
  }

  return (
    <Router>
      <div>
        <Header />
        <Routes>
          <Route path="/preguntas" element={<Preguntas />} />
          <Route path="/" element={
            <>
              <Table data={data} mydata={mydata} openModal={openModal} total={totalGastado()} />
              <Footer totalGastado={totalGastado()} bancoUsado={bancoMasUsado()} tarjetaUsada={tarjetaMasUsada()} />
              {modalVisible && (
                <>
                <Modal
                  formData={formData}
                  mydata={mydata}
                  data={data}
                  setMyData={setMyData}
                  setFormData={setFormData}
                  handleSubmit={handleSubmit}
                  handleDelete={handleDelete}
                  setModalVisible={setModalVisible}
                  handleEdit={handleEdit}
                  handleCloseModal={handleCloseModal}
                  handleChangeCierre={handleChangeCierre}
                  handleAgregarFondos={handleAgregarFondos}
                  modalType={modalType}
                />
                <div className="calculadora-align" onClick={() => window.location.href = 'ms-calculator://'}>
                    <FaCalculator size={30} />
                </div>
                </>
              )}
            </>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;