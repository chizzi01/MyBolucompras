import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificacionesPendientesService } from '../../services/notificacionesPendientesService';
import { useAuth } from '../../context/AuthContext';

export function useNotificacionesPendientesMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = ['notificacionesPendientes', user?.id];

  const confirmar = useMutation({
    mutationFn: ({ id, gastoId }) => notificacionesPendientesService.confirmar(id, gastoId),
    onSuccess: (_, { id }) => {
      queryClient.setQueryData(queryKey, (old) => (old ?? []).filter((p) => p.id !== id));
    },
  });

  const descartar = useMutation({
    mutationFn: (id) => notificacionesPendientesService.descartar(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData(queryKey, (old) => (old ?? []).filter((p) => p.id !== id));
    },
  });

  return { confirmar, descartar };
}
