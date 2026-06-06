import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured =
  supabaseUrl !== '' &&
  supabaseUrl !== 'tu_url_aqui' &&
  supabaseUrl.startsWith('http') &&
  supabaseAnonKey !== '' &&
  supabaseAnonKey !== 'tu_anon_key_aqui';

// Solo crear el cliente si la URL es válida para evitar el error de Supabase
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as unknown as SupabaseClient);
