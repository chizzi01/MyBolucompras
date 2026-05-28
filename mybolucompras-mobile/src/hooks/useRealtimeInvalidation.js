import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useRealtimeInvalidation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const gastosChannel = supabase
      .channel(`gastos-rt-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gastos', filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['gastos', user.id] })
      )
      .subscribe();

    const deudoresChannel = supabase
      .channel(`deudores-rt-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deudores', filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['deudas', user.id] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gastosChannel);
      supabase.removeChannel(deudoresChannel);
    };
  }, [user?.id, queryClient]);
}
