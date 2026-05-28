import { useQuery } from '@tanstack/react-query';
import { viajesService } from '../../services/viajesService';
import { viajeGastosService } from '../../services/viajeGastosService';

export function useViajeDetalle(viajeId) {
  const viaje = useQuery({
    queryKey: ['viaje', viajeId],
    queryFn: () => viajesService.getById(viajeId),
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!viajeId,
  });

  const gastos = useQuery({
    queryKey: ['viaje-gastos', viajeId],
    queryFn: () => viajeGastosService.getByViaje(viajeId),
    staleTime: 2 * 60 * 1000,
    gcTime: 8 * 60 * 1000,
    enabled: !!viajeId,
  });

  return {
    viaje: viaje.data ?? null,
    gastos: gastos.data ?? [],
    loading: viaje.isLoading || gastos.isLoading,
    refetch: () => { viaje.refetch(); gastos.refetch(); },
  };
}
