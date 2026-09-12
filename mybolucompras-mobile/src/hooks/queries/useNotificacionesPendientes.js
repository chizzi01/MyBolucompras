import { useQuery } from '@tanstack/react-query';
import { notificacionesPendientesService } from '../../services/notificacionesPendientesService';
import { useAuth } from '../../context/AuthContext';

export function useNotificacionesPendientes() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['notificacionesPendientes', user?.id],
    queryFn: notificacionesPendientesService.getPendientes,
    staleTime: 60 * 1000,
    enabled: !!user,
    placeholderData: [],
  });
  return {
    ...query,
    pendientes: query.data ?? [],
    loading: query.isLoading,
  };
}
