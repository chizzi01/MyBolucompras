import { useMutation, useQueryClient } from '@tanstack/react-query';
import { configuracionService } from '../../services/configuracionService';
import { useAuth } from '../../context/AuthContext';

export function useConfiguracionMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = ['configuracion', user?.id];

  const actualizar = useMutation({
    // Recibe solo los campos a cambiar; el resto de la config queda intacto.
    mutationFn: (patch) => configuracionService.actualizar(patch),
    onMutate: async (nuevoConfig) => {
      // Sin la config real en cache, los valores que ve la pantalla son el
      // placeholder por defecto: guardar a partir de ellos (ej. etiquetas
      // derivadas de mydata.etiquetas) borraría datos del usuario.
      if (queryClient.getQueryData(queryKey) === undefined) {
        throw new Error('La configuración todavía no cargó. Probá de nuevo en un momento.');
      }
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
