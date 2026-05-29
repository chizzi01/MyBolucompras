// src/hooks/queries/useViajePagos.js
import { useQuery } from '@tanstack/react-query';
import { viajePagosService } from '../../services/viajePagosService';

export function useViajePagos(viajeId) {
  const query = useQuery({
    queryKey: ['viaje_pagos', viajeId],
    queryFn: () => viajePagosService.getByViaje(viajeId),
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!viajeId,
  });
  return {
    ...query,
    pagos: query.data ?? [],
    loading: query.isLoading,
  };
}
