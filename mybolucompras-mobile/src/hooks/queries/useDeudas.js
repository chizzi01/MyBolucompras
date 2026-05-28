import { useQuery } from '@tanstack/react-query';
import { deudoresService } from '../../services/deudoresService';
import { useAuth } from '../../context/AuthContext';

export function useDeudas() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['deudas', user?.id],
    queryFn: deudoresService.getAll,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!user,
  });
  return {
    ...query,
    deudas: query.data ?? [],
    loading: query.isLoading,
  };
}
