import { useQuery } from '@tanstack/react-query';
import { viajeNotasService } from '../../services/viajeNotasService';

export function useViajeNotas(viajeId) {
  const checklist = useQuery({
    queryKey: ['viaje-checklist', viajeId],
    queryFn: () => viajeNotasService.getChecklist(viajeId),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    enabled: !!viajeId,
  });

  const notas = useQuery({
    queryKey: ['viaje-notas', viajeId],
    queryFn: () => viajeNotasService.getNotas(viajeId),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    enabled: !!viajeId,
  });

  return {
    checklist: checklist.data ?? [],
    notas: notas.data ?? [],
    loading: checklist.isLoading || notas.isLoading,
  };
}
