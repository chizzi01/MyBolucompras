import { useMutation, useQueryClient } from '@tanstack/react-query';
import { viajeGastosService } from '../../services/viajeGastosService';
import { useAuth } from '../../context/AuthContext';

export function useViajeGastoMutations(viajeId) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const agregar = useMutation({
    mutationFn: ({ gastoData, splitConfig, viajeParticipantes }) =>
      viajeGastosService.agregarGasto(viajeId, gastoData, splitConfig, viajeParticipantes),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['viaje-gastos', viajeId] });
    },
  });

  return { agregar };
}
