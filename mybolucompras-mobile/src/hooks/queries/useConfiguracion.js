import { useQuery } from '@tanstack/react-query';
import { configuracionService } from '../../services/configuracionService';
import { useAuth } from '../../context/AuthContext';

const defaultMydata = {
  cierre: '', vencimiento: '',
  cierreAnterior: '', vencimientoAnterior: '',
  fondos: 0, etiquetas: [], presupuestos: {},
  presupuestoMensualMax: 0, bancosHabilitados: [],
  mediosHabilitados: [], monedaPreferida: 'ARS',
  modoViajeActivo: false, modoViajeViajeId: null, modoViajePromptedIds: [],
};

export function useConfiguracion() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['configuracion', user?.id],
    queryFn: configuracionService.get,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!user,
    placeholderData: defaultMydata,
  });
  return {
    ...query,
    mydata: query.data ?? defaultMydata,
  };
}
