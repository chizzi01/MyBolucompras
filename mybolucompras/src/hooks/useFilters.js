import { useState, useMemo } from 'react';
import { calcularCuotasRestantesCredito, calcularCuotasRestantes } from '../utils/cuotas';
import { useDebounce } from './useDebounce';

export function useFilters(gastos, mydata) {
  const [filterObjectInput, setFilterObjectInput] = useState('');
  const filterObject = useDebounce(filterObjectInput, 200);
  const [filterType, setFilterType] = useState('');
  const [filterBank, setFilterBank] = useState('');
  const [filterMedio, setFilterMedio] = useState('');
  const [filterEtiqueta, setFilterEtiqueta] = useState('');
  const [filterMoneda, setFilterMoneda] = useState('');
  const [isSwitchOn, setIsSwitchOn] = useState(false);

  const calcularCuotas = (item) => {
    return item?.tipo === 'debito'
      ? calcularCuotasRestantes(item?.fecha || '', item?.cuotas || 1)
      : calcularCuotasRestantesCredito(
        item?.fecha || '', item?.cuotas || 1,
        mydata?.vencimiento || null, mydata?.cierre || null,
        mydata?.vencimientoAnterior || null, mydata?.cierreAnterior || null
      );
  };

  const filteredData = useMemo(() => {
    if (!Array.isArray(gastos)) return [];
    return gastos.filter(item => (
      (filterObject === '' || item?.objeto?.toLowerCase().includes(filterObject.toLowerCase())) &&
      (filterType === '' || item?.tipo === filterType) &&
      (filterBank === '' || item?.banco === filterBank) &&
      (filterMedio === '' || item?.medio === filterMedio) &&
      (filterEtiqueta === '' || item?.etiqueta === filterEtiqueta) &&
      (filterMoneda === '' || item?.moneda === filterMoneda) &&
      (isSwitchOn || calcularCuotas(item) >= 1)
    ));
  }, [gastos, filterObject, filterType, filterBank, filterMedio, filterEtiqueta, filterMoneda, isSwitchOn, mydata]);

  const uniqueBanks = useMemo(() =>
    [...new Set(gastos?.map(i => i?.banco).filter(Boolean))], [gastos]);
  const uniqueMedios = useMemo(() =>
    [...new Set(gastos?.map(i => i?.medio).filter(Boolean))], [gastos]);
  const uniqueEtiquetas = useMemo(() =>
    [...new Set(gastos?.filter(i => i?.etiqueta).map(i => i.etiqueta))], [gastos]);
  const uniqueMonedas = useMemo(() =>
    [...new Set(gastos?.map(i => i?.moneda).filter(Boolean))], [gastos]);

  const filters = {
    filterObject: filterObjectInput, setFilterObject: setFilterObjectInput,
    filterType, setFilterType,
    filterBank, setFilterBank,
    filterMedio, setFilterMedio,
    filterEtiqueta, setFilterEtiqueta,
    filterMoneda, setFilterMoneda,
    isSwitchOn,
    handleSwitchChange: () => setIsSwitchOn(v => !v),
  };

  return { filteredData, filters, uniqueBanks, uniqueMedios, uniqueEtiquetas, uniqueMonedas };
}
