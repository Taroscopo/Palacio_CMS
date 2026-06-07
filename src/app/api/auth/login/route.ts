import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured, type ClienteRow } from '@/lib/supabase';

// ============================================================
// Tipos compartidos de respuesta
// ============================================================

interface LoginSuccessResponse {
  success: true;
  user: {
    id: string;
    email: string;
    nombre: string;
    rol: 'admin' | 'cliente';
    estadoSuscripcion: 'gratis' | 'anual';
    cambiosEsteMes: number;
    sustratoNombre: string;
    sustratoId: string;
  };
}

interface LoginErrorResponse {
  success: false;
  error: string;
}

// ============================================================
// Datos fallback para modo demo (cuando Supabase no está configurado)
// ============================================================

const DEMO_USERS: Record<string, LoginSuccessResponse['user']> = {
  'admin@palacio.cms': {
    id: 'demo-admin-001',
    email: 'admin@palacio.cms',
    nombre: 'Administrador Maestro',
    rol: 'admin',
    estadoSuscripcion: 'anual',
    cambiosEsteMes: 0,
    sustratoNombre: 'Panel de Control',
    sustratoId: '',
  },
  'cliente@demo.com': {
    id: 'demo-cliente-001',
    email: 'cliente@demo.com',
    nombre: 'Cliente Demo',
    rol: 'cliente',
    estadoSuscripcion: 'gratis',
    cambiosEsteMes: 1,
    sustratoNombre: 'Landing Demo',
    sustratoId: 'demo-s1',
  },
  'premium@demo.com': {
    id: 'demo-premium-001',
    email: 'premium@demo.com',
    nombre: 'Cliente Premium',
    rol: 'cliente',
    estadoSuscripcion: 'anual',
    cambiosEsteMes: 12,
    sustratoNombre: 'Landing Premium',
    sustratoId: 'demo-s2',
  },
};

const DEMO_PASSWORDS: Record<string, string> = {
  'admin@palacio.cms': 'admin123',
  'cliente@demo.com': 'demo123',
  'premium@demo.com': 'premium123',
};

// ============================================================
// POST /api/auth/login
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json<LoginErrorResponse>(
        { success: false, error: 'Email y contraseña son obligatorios' },
        { status: 400 }
      );
    }

    // ----------------------------------------------------------
    // ADMINISTRADOR MAESTRO (Acceso Global)
    // ----------------------------------------------------------
    if (email === 'admin@palacio.cms') {
      if (password === 'admin123') {
        return NextResponse.json<LoginSuccessResponse>({
          success: true,
          user: {
            id: 'admin-master-001',
            email: 'admin@palacio.cms',
            nombre: 'Administrador Maestro',
            rol: 'admin',
            estadoSuscripcion: 'anual',
            cambiosEsteMes: 0,
            sustratoNombre: 'Panel de Control',
            sustratoId: '',
          },
        });
      } else {
        return NextResponse.json<LoginErrorResponse>(
          { success: false, error: 'Contraseña incorrecta para el administrador.' },
          { status: 401 }
        );
      }
    }

    // ----------------------------------------------------------
    // RUTA REAL: Supabase está configurado
    // Consulta la tabla 'clientes' buscando por email
    // ----------------------------------------------------------
    if (isSupabaseConfigured) {
      const { data: cliente, error: clienteError } = await supabase
        .from('clientes')
        .select('id, email, nombre_sitio, plan, repo_owner, repo_name')
        .eq('email', email)
        .single();

      if (clienteError) {
        console.error('[API Auth Login] Error al consultar base de datos:', clienteError.message);
        
        // PGRST116 indica que no se encontró ninguna fila con ese correo (User Not Found)
        if (clienteError.code === 'PGRST116') {
          return NextResponse.json<LoginErrorResponse>(
            { success: false, error: 'Credenciales inválidas. Verifica tu correo y contraseña.' },
            { status: 401 }
          );
        }
        
        // Otro error de base de datos o de red
        return NextResponse.json<LoginErrorResponse>(
          { success: false, error: `Error de conexión con Supabase: ${clienteError.message || 'No se pudo contactar al servidor'}` },
          { status: 500 }
        );
      }

      if (!cliente) {
        return NextResponse.json<LoginErrorResponse>(
          { success: false, error: 'Credenciales inválidas. Verifica tu correo y contraseña.' },
          { status: 401 }
        );
      }

      const row = cliente as ClienteRow;

      // Contar cambios del mes actual para este cliente
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const { count: cambiosEsteMes } = await supabase
        .from('cambios_log')
        .select('id', { count: 'exact', head: true })
        .eq('cliente_id', row.id)
        .gte('creado_en', inicioMes.toISOString());

      return NextResponse.json<LoginSuccessResponse>({
        success: true,
        user: {
          id: row.id,
          email: row.email,
          nombre: row.nombre_sitio || row.email.split('@')[0],
          rol: 'cliente',
          estadoSuscripcion: (row.plan as 'gratis' | 'anual') || 'gratis',
          cambiosEsteMes: cambiosEsteMes ?? 0,
          sustratoNombre: row.nombre_sitio || `${row.repo_owner}/${row.repo_name}`,
          sustratoId: row.id,
        },
      });
    }

    // ----------------------------------------------------------
    // RUTA FALLBACK: Modo Demo (Supabase no configurado)
    // ----------------------------------------------------------
    const demoUser = DEMO_USERS[email];

    if (!demoUser) {
      return NextResponse.json<LoginErrorResponse>(
        { success: false, error: 'Credenciales inválidas. Usa una de las cuentas de demostración.' },
        { status: 401 }
      );
    }

    if (DEMO_PASSWORDS[email] !== password) {
      return NextResponse.json<LoginErrorResponse>(
        { success: false, error: 'Contraseña incorrecta.' },
        { status: 401 }
      );
    }

    return NextResponse.json<LoginSuccessResponse>({
      success: true,
      user: demoUser,
    });
  } catch (error) {
    console.error('[API Auth Login] Error:', error);
    return NextResponse.json<LoginErrorResponse>(
      { success: false, error: 'Error interno del servidor. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}
