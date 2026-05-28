import { useQuery } from '@tanstack/react-query';
import { viajesService } from '../../services/viajesService';
import { useAuth } from '../../context/AuthContext';

export function useViajes() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['viajes', user?.id],
    queryFn: viajesService.getAll,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!user,
  });
  return {
    ...query,
    viajes: query.data ?? [],
    viajesActivos: (query.data ?? []).filter(v => v.estado === 'activo'),
    loading: query.isLoading,
  };
}
