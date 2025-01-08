import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Table from './components/Table';
import Modal from './components/Modal';
import Header from './components/Navbar';
import Footer from './components/Footer';
import Preguntas from './components/Preguntas';

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
        if (!myResponse.vencimiento || new Date(myResponse.vencimiento) < new Date()) {
          openModal('vencimiento');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);


  const agregarDatosObjeto = (id, objeto, fecha, medio, cuotas, tipo, banco, cantidad, precio) => {
    const precioPorCuota = Number(precio) / Number(cuotas);
    const NuevoObjeto = {
      id: id,
      isFijo: false,
      objeto: objeto.charAt(0).toUpperCase() + objeto.slice(1),
      fecha: fecha.split("-").reverse().join("/"),
      medio: medio,
      cuotas: Number(cuotas),
      tipo: tipo,
      banco: banco,
      cantidad: Number(cantidad),
      precio: isNaN(precioPorCuota) || !isFinite(precioPorCuota) ? "$ 0" : `$ ${precioPorCuota.toFixed(2)}`
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

  const handleSubmit = (event) => {
    event.preventDefault();
    const id = generateUniqueId();
    if (modalType === 'repetitivo') {
      agregarDatosObjetoFijo(id, formData.objeto, formData.fecha, formData.medio, formData.cuotas, formData.banco, formData.cantidad, formData.precio);
    } else {
      agregarDatosObjeto(id, formData.objeto, formData.fecha, formData.medio, formData.cuotas, formData.tipo, formData.banco, formData.cantidad, formData.precio);
    }
    setModalVisible(false);
  };

  const handleDelete = () => {
    const updatedData = data.filter(item => item.id !== formData.id);
    setData(updatedData);
    saveData(updatedData);
    setModalVisible(false);
  };

  const handleEdit = () => {
    const updatedData = data.map(item => item.id === formData.id ? formData : item);
    setData(updatedData);
    saveData(updatedData);
    setModalVisible(false);
  };

  const handleChangeVencimiento = (event) => {
    const { value } = event.target;
    const updatedMyData = { ...mydata, vencimiento: value };
    setMyData(updatedMyData);
    saveMyData(updatedMyData);
    setModalVisible(false);
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
    setModalType(type);
    if (type === 'eliminar' || type === 'editar') {
      const formattedItem = {
        ...item,
        fecha: item.fecha.split('/').reverse().join('-'), // Formatea la fecha a yyyy-mm-dd
        precio: item.precio.replace('$', '').trim() * item.cuotas // Elimina el símbolo de dólar y los espacios en blanco
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
      if (item.precio && typeof item.precio === 'string') {
        total += parseFloat(item.precio.replace('$', ''));
      }
    });

    return total;
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
                handleChangeVencimiento={handleChangeVencimiento}
                handleAgregarFondos={handleAgregarFondos}
                modalType={modalType}
              />
            )}
            </>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;