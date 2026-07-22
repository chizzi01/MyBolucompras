import { useMutation, useQueryClient } from '@tanstack/react-query';
import { viajeNotasService } from '../../services/viajeNotasService';

export function useViajeNotasMutations(viajeId) {
  const queryClient = useQueryClient();

  const agregarItem = useMutation({
    mutationFn: ({ texto, tipo }) => viajeNotasService.agregarItem(viajeId, texto, tipo),
    onSuccess: (nuevo) => {
      queryClient.setQueryData(['viaje-checklist', viajeId], (prev = []) => [...prev, nuevo]);
    },
  });

  const toggleItem = useMutation({
    mutationFn: ({ itemId, userId, marcar }) => viajeNotasService.toggleItem(itemId, userId, marcar),
    onMutate: async ({ itemId, userId, marcar }) => {
      await queryClient.cancelQueries({ queryKey: ['viaje-checklist', viajeId] });
      const prev = queryClient.getQueryData(['viaje-checklist', viajeId]);
      queryClient.setQueryData(['viaje-checklist', viajeId], (old = []) =>
        old.map(i => {
          if (i.id !== itemId) return i;
          const completadosPor = marcar
            ? [...new Set([...i.completadosPor, userId])]
            : i.completadosPor.filter(id => id !== userId);
          return { ...i, completadosPor };
        })
      );
      return { prev };
    },
    onError: (_, __, ctx) => {
      queryClient.setQueryData(['viaje-checklist', viajeId], ctx.prev);
    },
  });

  const eliminarItem = useMutation({
    mutationFn: (itemId) => viajeNotasService.eliminarItem(itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: ['viaje-checklist', viajeId] });
      const prev = queryClient.getQueryData(['viaje-checklist', viajeId]);
      queryClient.setQueryData(['viaje-checklist', viajeId], (old = []) =>
        old.filter(i => i.id !== itemId)
      );
      return { prev };
    },
    onError: (_, __, ctx) => {
      queryClient.setQueryData(['viaje-checklist', viajeId], ctx.prev);
    },
  });

  const agregarNota = useMutation({
    mutationFn: (texto) => viajeNotasService.agregarNota(viajeId, texto),
    onSuccess: (nueva) => {
      queryClient.setQueryData(['viaje-notas', viajeId], (prev = []) => [nueva, ...prev]);
    },
  });

  const eliminarNota = useMutation({
    mutationFn: (notaId) => viajeNotasService.eliminarNota(notaId),
    onMutate: async (notaId) => {
      await queryClient.cancelQueries({ queryKey: ['viaje-notas', viajeId] });
      const prev = queryClient.getQueryData(['viaje-notas', viajeId]);
      queryClient.setQueryData(['viaje-notas', viajeId], (old = []) =>
        old.filter(n => n.id !== notaId)
      );
      return { prev };
    },
    onError: (_, __, ctx) => {
      queryClient.setQueryData(['viaje-notas', viajeId], ctx.prev);
    },
  });

  return { agregarItem, toggleItem, eliminarItem, agregarNota, eliminarNota };
}
