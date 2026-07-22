import { useQuery } from '@tanstack/react-query';
import { viajeActividadesService } from '../../services/viajeActividadesService';

export function useViajeActividades(viajeId) {
  const query = useQuery({
    queryKey: ['viaje-actividades', viajeId],
    queryFn: () => viajeActividadesService.getByViaje(viajeId),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    enabled: !!viajeId,
  });

  return { actividades: query.data ?? [], loading: query.isLoading };
}
