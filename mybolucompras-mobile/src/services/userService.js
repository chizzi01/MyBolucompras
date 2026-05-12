import { supabase } from '../lib/supabase';

export const userService = {
  async buscarPorEmail(email) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, nombre')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  async getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }
};
