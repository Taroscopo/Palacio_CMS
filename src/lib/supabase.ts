// ============================================================
// PALACIO CMS — Cliente de Supabase (Unificado)
// ============================================================
// Cliente oficial utilizando @supabase/supabase-js.
// Lee estrictamente las variables de entorno:
//   - NEXT_PUBLIC_SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY
//
// Si las variables no están configuradas, el cliente se
// crea como null y isSupabaseConfigured devuelve false.
// Los consumidores deben verificar este flag antes de
// realizar consultas.
// ============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

/**
 * Indica si las credenciales de Supabase están correctamente
 * configuradas en las variables de entorno.
 */
export const isSupabaseConfigured: boolean =
  supabaseUrl !== '' &&
  supabaseUrl !== 'tu_url_aqui' &&
  supabaseUrl.startsWith('http') &&
  supabaseServiceKey !== '' &&
  supabaseServiceKey !== 'tu_service_role_key_aqui';

if (!isSupabaseConfigured) {
  console.warn(
    '[Supabase] Variables de entorno no configuradas. ' +
    'El backend operará en modo fallback/demo. ' +
    'Configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env'
  );
}

/**
 * Cliente de Supabase con rol de servicio (service_role).
 * Tiene acceso total a todas las tablas, sin restricciones RLS.
 * Usar exclusivamente en el backend (API routes, server actions).
 *
 * IMPORTANTE: NUNCA expongas este cliente ni la service_role_key
 * en el navegador / código del cliente.
 */
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : (null as unknown as SupabaseClient);

// ============================================================
// Tipos de la base de datos
// ============================================================

/** Fila de la tabla 'clientes' */
export interface ClienteRow {
  id: string;
  email: string;
  password?: string;
  nombre_sitio: string | null;
  plan: 'gratis' | 'anual';
  repo_owner: string;
  repo_name: string;
  repo_branch: string;
  creado_en: string;
}

/** Fila de la tabla 'cambios_log' */
export interface CambioLogRow {
  id: string;
  cliente_id: string;
  seccion: string;
  campo_id: string;
  valor?: string;
  creado_en: string;
}
