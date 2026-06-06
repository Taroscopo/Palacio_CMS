import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export const isSupabaseServerConfigured =
  supabaseUrl !== '' &&
  supabaseUrl !== 'tu_url_aqui' &&
  supabaseUrl.startsWith('http') &&
  supabaseServiceKey !== '' &&
  supabaseServiceKey !== 'tu_service_role_key_aqui';

export const supabaseServer: SupabaseClient = isSupabaseServerConfigured
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : (null as unknown as SupabaseClient);
