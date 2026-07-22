import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gastosService } from '../../services/gastosService';
import { useAuth } from '../../context/AuthContext';
import { gastoEntraEsteMes } from '../../utils/cuotas';

export function useGastoMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = ['gastos', user?.id];

  const agregar = useMutation({
    mutationFn: ({ gasto, sharedWith = null }) => gastosService.crear(gasto, sharedWith),
    onMutate: async ({ gasto }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData(queryKey);
      const optimistic = {
        id: `temp-${Date.now()}`,
        isFijo: gasto.isFijo ?? false,
        objeto: gasto.objeto,
        fecha: gasto.fecha,
        medio: gasto.medio,
        cuotas: gasto.cuotas,
        tipo: gasto.tipo,
        moneda: gasto.moneda || 'ARS',
        banco: gasto.banco || '',
        cantidad: gasto.cantidad,
        precio: `$ ${Number(gasto.precio).toFixed(2)}`,
        precioNum: Number(gasto.precio),
        etiqueta: gasto.etiqueta || '',
        compartidoConNombre: null,
        compartidoConUserId: null,
        pagado: false,
      };
      queryClient.setQueryData(queryKey, old => [optimistic, ...(old ?? [])]);
      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev !== undefined) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const editar = useMutation({
    mutationFn: ({ id, gasto, sharedWith = null }) => gastosService.actualizar(id, gasto, sharedWith),
    onMutate: async ({ id, gasto }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, old =>
        (old ?? []).map(g => g.id === id ? { ...g, ...gasto, precioNum: Number(gasto.precio), precio: `$ ${Number(gasto.precio).toFixed(2)}` } : g)
      );
      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev !== undefined) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const eliminar = useMutation({
    mutationFn: (id) => gastosService.eliminar(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, old => (old ?? []).filter(g => g.id !== id));
      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev !== undefined) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const marcarPagado = useMutation({
    mutationFn: ({ id, gasto, nombre, mydata }) => {
      if (!gastoEntraEsteMes(gasto, mydata)) {
        return Promise.reject(new Error('No se puede marcar como pagado un gasto que todavía no entra este mes'));
      }
      return gastosService.marcarPagadoConNotificacion(id, gasto, nombre);
    },
    onMutate: async ({ id, gasto, mydata }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData(queryKey);
      if (!gastoEntraEsteMes(gasto, mydata)) return { prev };
      queryClient.setQueryData(queryKey, old =>
        (old ?? []).map(g => g.id === id ? { ...g, pagado: true } : g)
      );
      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev !== undefined) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  return { agregar, editar, eliminar, marcarPagado };
}
