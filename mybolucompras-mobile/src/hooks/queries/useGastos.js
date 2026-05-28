import { useQuery } from '@tanstack/react-query';
import { gastosService } from '../../services/gastosService';
import { useAuth } from '../../context/AuthContext';

export function useGastos() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['gastos', user?.id],
    queryFn: gastosService.getAll,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!user,
  });
  return {
    ...query,
    gastos: query.data ?? [],
    loading: query.isLoading,
  };
}
