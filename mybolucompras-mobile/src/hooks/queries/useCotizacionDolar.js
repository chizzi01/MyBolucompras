import { useQuery } from '@tanstack/react-query';
import { cotizacionService } from '../../services/cotizacionService';

export function useCotizacionDolar() {
  const query = useQuery({
    queryKey: ['cotizacion-dolar-blue'],
    queryFn: cotizacionService.getDolarBlue,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
  return { cotizacion: query.data ?? null, isLoading: query.isLoading };
}
