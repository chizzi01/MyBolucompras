import React, { useState, useEffect } from 'react';
import Header from '../components/Navbar';
import { useData } from '../context/DataContext';
import { useToast } from '../components/Toast';
import { configuracionService } from '../services/configuracionService';
import { BANCOS, MEDIOS_DE_PAGO, MONEDAS } from '../constants/catalogos';
import '../styles/configuracion.css';
import '../styles/table.css';

export default function ConfiguracionPage() {
  const { mydata, setMydata, actualizarConfig } = useData();
  const addToast = useToast();

  const [bancosSeleccionados, setBancosSeleccionados] = useState([]);
  const [mediosSeleccionados, setMediosSeleccionados] = useState([]);
  const [monedaPreferida, setMonedaPreferida] = useState('ARS');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setBancosSeleccionados(mydata.bancosHabilitados || []);
    setMediosSeleccionados(mydata.mediosHabilitados || []);
    setMonedaPreferida(mydata.monedaPreferida || 'ARS');
  }, [mydata.bancosHabilitados, mydata.mediosHabilitados, mydata.monedaPreferida]);

  const toggleBanco = (banco) => {
    setBancosSeleccionados(prev =>
      prev.includes(banco) ? prev.filter(b => b !== banco) : [...prev, banco]
    );
  };

  const toggleMedio = (medio) => {
    setMediosSeleccionados(prev =>
      prev.includes(medio) ? prev.filter(m => m !== medio) : [...prev, medio]
    );
  };

  const handleToggleModoViaje = async () => {
    if (!mydata.modoViajeActivo) return;
    try {
      await actualizarConfig({
        modoViajeActivo: false,
        modoViajeViajeId: null,
      });
      addToast('Modo Viaje desactivado', 'success');
    } catch {
      addToast('Error al actualizar Modo Viaje', 'error');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updated = {
        ...mydata,
        bancosHabilitados: bancosSeleccionados,
        mediosHabilitados: mediosSeleccionados,
        monedaPreferida,
      };
      await configuracionService.actualizar(updated);
      setMydata(updated);
      addToast('Configuración guardada', 'success');
    } catch {
      addToast('Error al guardar la configuración', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header totalGastado={{}} />
      <div className="main-content">
        <div className="config-page">
          <div>
            <h1 className="config-page-title">Configuración</h1>
            <p className="config-page-subtitle">
              Personalizá qué bancos, medios de pago y moneda aparecen en el formulario de gastos.
            </p>
          </div>

          <div className="config-card">
            <div className="config-card-title">Bancos habilitados</div>
            <div className="config-card-desc">
              Solo estos bancos aparecerán en el selector. Si no seleccionás ninguno, aparecen todos.
            </div>
            <div className="config-chips">
              {BANCOS.map(banco => (
                <button
                  key={banco}
                  type="button"
                  className={`config-chip${bancosSeleccionados.includes(banco) ? ' active' : ''}`}
                  onClick={() => toggleBanco(banco)}
                >
                  {banco}
                </button>
              ))}
            </div>
          </div>

          <div className="config-card">
            <div className="config-card-title">Medios de pago</div>
            <div className="config-card-desc">
              Solo estos medios aparecerán en el selector. Si no seleccionás ninguno, aparecen todos.
            </div>
            <div className="config-chips">
              {MEDIOS_DE_PAGO.map(medio => (
                <button
                  key={medio}
                  type="button"
                  className={`config-chip${mediosSeleccionados.includes(medio) ? ' active' : ''}`}
                  onClick={() => toggleMedio(medio)}
                >
                  {medio}
                </button>
              ))}
            </div>
          </div>

          <div className="config-card">
            <div className="config-card-title">Moneda preferida</div>
            <div className="config-card-desc">
              Esta moneda se seleccionará por defecto al agregar un nuevo gasto.
            </div>
            <div className="config-chips">
              {MONEDAS.map(m => (
                <button
                  key={m.code}
                  type="button"
                  className={`config-chip${monedaPreferida === m.code ? ' active' : ''}`}
                  onClick={() => setMonedaPreferida(m.code)}
                >
                  {m.symbol} {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="config-card">
            <div className="config-card-title">✈️ Modo Viaje</div>
            <p className="config-card-desc">
              Cuando está activo, la app te lleva directo al viaje seleccionado al abrirla. Solo puede activarse desde el aviso automático al detectar un viaje en curso; acá podés desactivarlo.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                {mydata.modoViajeActivo ? 'Activado' : 'Desactivado'}
              </span>
              <div
                className={`switch-track${mydata.modoViajeActivo ? ' on' : ''}`}
                style={{
                  width: 48,
                  height: 26,
                  cursor: mydata.modoViajeActivo ? 'pointer' : 'not-allowed',
                  opacity: mydata.modoViajeActivo ? 1 : 0.5,
                }}
                onClick={handleToggleModoViaje}
                role="switch"
                aria-checked={!!mydata.modoViajeActivo}
                aria-disabled={!mydata.modoViajeActivo}
              >
                <div className="switch-thumb" style={{ width: 18, height: 18, top: 4, left: mydata.modoViajeActivo ? 26 : 4 }} />
              </div>
            </div>
          </div>

          <button
            className="config-save-btn"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </div>
      </div>
    </div>
  );
}
