import { useMutation, useQueryClient } from '@tanstack/react-query';
import { configuracionService } from '../../services/configuracionService';
import { useAuth } from '../../context/AuthContext';

export function useConfiguracionMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = ['configuracion', user?.id];

  const actualizar = useMutation({
    mutationFn: (config) => configuracionService.actualizar(config),
    onMutate: async (nuevoConfig) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, old => ({ ...(old ?? {}), ...nuevoConfig }));
      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev !== undefined) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  return { actualizar };
}
