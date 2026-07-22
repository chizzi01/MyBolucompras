import { useMutation, useQueryClient } from '@tanstack/react-query';
import { viajeActividadesService } from '../../services/viajeActividadesService';

export function useViajeActividadMutations(viajeId) {
  const queryClient = useQueryClient();
  const key = ['viaje-actividades', viajeId];

  const crear = useMutation({
    mutationFn: (campos) => viajeActividadesService.crear(viajeId, campos),
    onSuccess: (nueva) => {
      queryClient.setQueryData(key, (prev = []) => [...prev, nueva]);
    },
  });

  const editar = useMutation({
    mutationFn: ({ id, campos }) => viajeActividadesService.editar(id, campos),
    onSuccess: (actualizada) => {
      queryClient.setQueryData(key, (prev = []) => prev.map(a => a.id === actualizada.id ? actualizada : a));
    },
  });

  const eliminar = useMutation({
    mutationFn: (id) => viajeActividadesService.eliminar(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (old = []) => old.filter(a => a.id !== id));
      return { prev };
    },
    onError: (_, __, ctx) => {
      queryClient.setQueryData(key, ctx.prev);
    },
  });

  return { crear, editar, eliminar };
}
