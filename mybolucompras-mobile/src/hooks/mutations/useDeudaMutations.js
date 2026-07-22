import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deudoresService } from '../../services/deudoresService';
import { useAuth } from '../../context/AuthContext';
import { gastoEntraEsteMes } from '../../utils/cuotas';

const deudaEntraEsteMes = (deuda, mydata) =>
  gastoEntraEsteMes({ ...deuda, fecha: deuda.fechaDeuda }, mydata);

export function useDeudaMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = ['deudas', user?.id];

  const agregar = useMutation({
    mutationFn: ({ deuda, sharedWith = null }) => deudoresService.crear(deuda, sharedWith),
    onMutate: async ({ deuda }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, old => [{ id: `temp-${Date.now()}`, ...deuda }, ...(old ?? [])]);
      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev !== undefined) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const editar = useMutation({
    mutationFn: ({ id, deuda }) => deudoresService.actualizar(id, deuda),
    onMutate: async ({ id, deuda }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, old =>
        (old ?? []).map(d => d.id === id ? { ...d, ...deuda } : d)
      );
      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev !== undefined) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const eliminar = useMutation({
    mutationFn: (id) => deudoresService.eliminar(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, old => (old ?? []).filter(d => d.id !== id));
      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev !== undefined) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const marcarPagada = useMutation({
    mutationFn: ({ id, deuda, nombre, mydata }) => {
      if (!deudaEntraEsteMes(deuda, mydata)) {
        return Promise.reject(new Error('No se puede marcar como pagada una deuda que todavía no entra este mes'));
      }
      return deudoresService.marcarPagadaConNotificacion(id, deuda, nombre);
    },
    onMutate: async ({ id, deuda, mydata }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData(queryKey);
      if (!deudaEntraEsteMes(deuda, mydata)) return { prev };
      const today = new Date().toISOString().split('T')[0].split('-').reverse().join('/');
      queryClient.setQueryData(queryKey, old =>
        (old ?? []).map(d => d.id === id ? { ...d, pagado: true, fechaPago: today } : d)
      );
      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev !== undefined) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const enviarRecordatorio = useMutation({
    mutationFn: ({ deuda, nombre }) => deudoresService.enviarRecordatorio(deuda, nombre),
    onMutate: async ({ deuda }) => {
      const prev = queryClient.getQueryData(queryKey);
      const now = new Date().toISOString();
      queryClient.setQueryData(queryKey, old =>
        (old ?? []).map(d => d.id === deuda.id ? { ...d, ultimoRecordatorio: now } : d)
      );
      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev !== undefined) queryClient.setQueryData(queryKey, context.prev);
    },
  });

  return { agregar, editar, eliminar, marcarPagada, enviarRecordatorio };
}
