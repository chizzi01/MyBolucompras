import { useMutation, useQueryClient } from '@tanstack/react-query';
import { viajesService } from '../../services/viajesService';
import { useAuth } from '../../context/AuthContext';

export function useViajeMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const listKey = ['viajes', user?.id];

  const crear = useMutation({
    mutationFn: ({ titulo, emoji, participanteIds, imagenUrl = null }) =>
      viajesService.crear(titulo, emoji, participanteIds, imagenUrl),
    onSettled: () => queryClient.invalidateQueries({ queryKey: listKey }),
  });

  const cerrar = useMutation({
    mutationFn: (id) => viajesService.cerrar(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const prev = queryClient.getQueryData(listKey);
      const prevViaje = queryClient.getQueryData(['viaje', id]);
      queryClient.setQueryData(listKey, old =>
        (old ?? []).map(v => v.id === id ? { ...v, estado: 'cerrado' } : v)
      );
      queryClient.setQueryData(['viaje', id], old => old ? { ...old, estado: 'cerrado' } : old);
      return { prev, prevViaje };
    },
    onError: (_, id, context) => {
      if (context?.prev !== undefined) queryClient.setQueryData(listKey, context.prev);
      if (context?.prevViaje !== undefined) queryClient.setQueryData(['viaje', id], context.prevViaje);
    },
    onSettled: (_, __, id) => {
      queryClient.invalidateQueries({ queryKey: listKey });
      queryClient.invalidateQueries({ queryKey: ['viaje', id] });
      queryClient.invalidateQueries({ queryKey: ['gastos'] });
      queryClient.invalidateQueries({ queryKey: ['viaje_pagos', id] });
    },
  });

  const eliminar = useMutation({
    mutationFn: (id) => viajesService.eliminar(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const prev = queryClient.getQueryData(listKey);
      queryClient.setQueryData(listKey, old => (old ?? []).filter(v => v.id !== id));
      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev !== undefined) queryClient.setQueryData(listKey, context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: listKey }),
  });

  const editar = useMutation({
    mutationFn: ({ id, campos }) => viajesService.editarViaje(id, campos),
    onMutate: async ({ id, campos }) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const prev = queryClient.getQueryData(listKey);
      const prevViaje = queryClient.getQueryData(['viaje', id]);
      queryClient.setQueryData(listKey, old =>
        (old ?? []).map(v => v.id === id ? { ...v, ...campos } : v)
      );
      queryClient.setQueryData(['viaje', id], old => old ? { ...old, ...campos } : old);
      return { prev, prevViaje };
    },
    onError: (_, { id }, context) => {
      if (context?.prev !== undefined) queryClient.setQueryData(listKey, context.prev);
      if (context?.prevViaje !== undefined) queryClient.setQueryData(['viaje', id], context.prevViaje);
    },
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: listKey });
      queryClient.invalidateQueries({ queryKey: ['viaje', id] });
    },
  });

  return { crear, cerrar, eliminar, editar };
}
