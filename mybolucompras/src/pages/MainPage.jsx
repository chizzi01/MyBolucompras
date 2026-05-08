import React, { useState, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { configuracionService } from '../services/configuracionService';
import { useFilters } from '../hooks/useFilters';
import { useCalculations } from '../hooks/useCalculations';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Header from '../components/Navbar';
import Footer from '../components/Footer';
import { useToast } from '../components/Toast';
import { FaCalculator } from "react-icons/fa6";

function MainPage() {
  const addToast = useToast();
  const {
    gastos, mydata, setMydata, loading,
    agregarGasto, editarGasto, eliminarGasto, actualizarEtiquetaGasto,
    actualizarCierre, actualizarFondos, agregarEtiqueta, eliminarEtiqueta,
  } = useData();

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('');
  const [formData, setFormData] = useState({
    objeto: '', fecha: '', medio: '', cuotas: 1, tipo: 'debito',
    moneda: '', banco: '', cantidad: 1, precio: '', etiqueta: '', color: ''
  });

  const { filteredData, filters, uniqueBanks, uniqueMedios, uniqueEtiquetas, uniqueMonedas } =
    useFilters(gastos, mydata);

  const { totalGastado, bancoMasUsado, tarjetaMasUsada } =
    useCalculations(gastos, mydata, filteredData);

  const handleSubmit = async () => {
    const gasto = {
      isFijo: modalType === 'repetitivo',
      objeto: formData.objeto.charAt(0).toUpperCase() + formData.objeto.slice(1),
      fecha: formData.fecha,
      medio: formData.medio,
      cuotas: formData.tipo === 'debito' ? 1 : Number(formData.cuotas),
      tipo: formData.medio === 'Efectivo' ? 'debito' : (modalType === 'repetitivo' ? 'debito' : formData.tipo),
      moneda: formData.moneda,
      banco: formData.banco,
      cantidad: Number(formData.cantidad),
      precio: modalType === 'repetitivo'
        ? String(Number(formData.precio) * Number(formData.cantidad))
        : formData.precio,
    };
    try {
      await agregarGasto(gasto);
      setModalVisible(false);
      setFormData({ objeto: '', fecha: '', medio: '', cuotas: 1, tipo: '', banco: '', cantidad: 1, precio: '', moneda: '' });
      addToast('Gasto agregado correctamente', 'success');
    } catch {
      addToast('Error al agregar el gasto', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await eliminarGasto(formData.id);
      setModalVisible(false);
      addToast('Gasto eliminado', 'success');
    } catch {
      addToast('Error al eliminar el gasto', 'error');
    }
  };

  const handleEdit = async () => {
    const gasto = {
      ...formData,
      fecha: formData.fecha.includes('-') ? formData.fecha.split('-').reverse().join('/') : formData.fecha,
      precio: formData.isFijo
        ? String(parseFloat(formData.precio) * parseInt(formData.cantidad || 1, 10))
        : String(parseFloat(formData.precio)),
    };
    try {
      await editarGasto(formData.id, gasto);
      setModalVisible(false);
      addToast('Gasto actualizado', 'success');
    } catch {
      addToast('Error al editar el gasto', 'error');
    }
  };

  const handleDeleteEtiqueta = async () => {
    try {
      await eliminarEtiqueta(formData.etiqueta);
      setModalVisible(false);
      addToast('Grupo eliminado', 'success');
    } catch {
      addToast('Error al eliminar el grupo', 'error');
    }
  };

  const handleCreateEtiqueta = async () => {
    try {
      await actualizarEtiquetaGasto(formData.id, formData.etiqueta);
      if (formData.color && !mydata.etiquetas?.some(e => e.nombre === formData.etiqueta)) {
        await agregarEtiqueta(formData.etiqueta, formData.color);
      }
      setModalVisible(false);
      addToast('Grupo guardado', 'success');
    } catch {
      addToast('Error al guardar el grupo', 'error');
    }
  };

  const saveItem = async (updatedItem) => {
    await actualizarEtiquetaGasto(updatedItem.id, updatedItem.etiqueta);
  };

  const handleChangeCierre = async (event) => {
    const { value } = event.target;
    const cierreDate = new Date(value);
    let vencimientoDate = new Date(cierreDate);
    vencimientoDate.setDate(vencimientoDate.getDate() + 10);
    while (vencimientoDate.getDay() === 0 || vencimientoDate.getDay() === 5) {
      vencimientoDate.setDate(vencimientoDate.getDate() + 1);
    }
    const vencimientoFormatted = vencimientoDate.toISOString().split('T')[0];
    const cierreAnterior = new Date(cierreDate);
    cierreAnterior.setMonth(cierreAnterior.getMonth() - 1);
    while (cierreAnterior.getDay() === 0 || cierreAnterior.getDay() === 5) {
      cierreAnterior.setDate(cierreAnterior.getDate() - 1);
    }
    const cierreAnteriorFormatted = cierreAnterior.toISOString().split('T')[0];
    try {
      await actualizarCierre(value, vencimientoFormatted, cierreAnteriorFormatted, mydata.vencimiento || vencimientoFormatted);
      setModalVisible(false);
      addToast('Fecha de cierre actualizada', 'success');
    } catch {
      addToast('Error al actualizar el cierre', 'error');
    }
  };

  const handleAgregarFondos = async (event) => {
    try {
      await actualizarFondos(event.target.value);
      setModalVisible(false);
      addToast('Fondos actualizados', 'success');
    } catch {
      addToast('Error al actualizar los fondos', 'error');
    }
  };

  const saveMyData = async (updatedMyData) => {
    setMydata(updatedMyData);
    await configuracionService.actualizar(updatedMyData);
  };

  const openModal = useCallback((type, item = {}, etiqueta = '') => {
    setFormData({ objeto: '', fecha: '', medio: '', cuotas: 1, tipo: '', banco: '', cantidad: 1, precio: '', etiqueta: '' });
    setModalType(type);
    if (['eliminar', 'editar', 'crearEtiqueta', 'eliminarEtiqueta'].includes(type)) {
      setFormData({
        ...item,
        fecha: item.fecha ? item.fecha.split('/').reverse().join('-') : '',
        precio: item.isFijo
          ? (parseFloat(item.precio?.replace('$', '').trim()) / (item.cantidad || 1)).toFixed(2)
          : item.precio?.replace('$', '').trim() || '',
        cuotas: item.isFijo ? Number(item.cuotas) : (item.tipo === 'debito' ? 1 : Number(item.cuotas)),
        etiqueta: etiqueta || item.etiqueta || ''
      });
    }
    setModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setFormData({ objeto: '', fecha: '', medio: '', cuotas: 1, tipo: '', banco: '', cantidad: 1, precio: '' });
  }, []);

  if (loading) {
    return (
      <div>
        <Header />
        <div className="main-content">
          <div className="table-skeleton">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton-row" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header totalGastado={totalGastado} onPresupuestoClick={() => openModal('presupuesto')} />
      <div className="main-content">
        <Table
          data={filteredData}
          mydata={mydata}
          openModal={openModal}
          total={totalGastado}
          uniqueBanks={uniqueBanks}
          uniqueMedios={uniqueMedios}
          uniqueEtiquetas={uniqueEtiquetas}
          uniqueMonedas={uniqueMonedas}
          saveItem={saveItem}
          filters={filters}
        />
        <Footer totalGastado={totalGastado} bancoUsado={bancoMasUsado} tarjetaUsada={tarjetaMasUsada} />

        {modalVisible && (
          <>
            <Modal
              formData={formData}
              mydata={mydata}
              data={gastos}
              setMyData={setMydata}
              saveMyData={saveMyData}
              setFormData={setFormData}
              handleSubmit={handleSubmit}
              handleDelete={handleDelete}
              handleDeleteEtiqueta={handleDeleteEtiqueta}
              setModalVisible={setModalVisible}
              handleEdit={handleEdit}
              handleCloseModal={handleCloseModal}
              handleChangeCierre={handleChangeCierre}
              handleAgregarFondos={handleAgregarFondos}
              handleCreateEtiqueta={handleCreateEtiqueta}
              totalGastado={totalGastado}
              modalType={modalType}
            />
            {!['vencimiento', 'fondos', 'crearEtiqueta', 'reporte', 'eliminarEtiqueta', 'eliminar'].includes(modalType) && (
              <div className="calculadora-align" onClick={() => window.location.href = 'ms-calculator://'}>
                <FaCalculator size={30} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default MainPage;
