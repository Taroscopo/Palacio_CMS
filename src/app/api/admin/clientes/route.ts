import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured, type ClienteRow } from '@/lib/supabase';

// ============================================================
// Tipos
// ============================================================

interface ClienteData {
  id: string;
  email: string;
  nombre: string;
  plan: string;
  repoOwner: string;
  repoName: string;
  repoBranch: string;
  totalCambios: number;
}

// ============================================================
// Datos fallback para modo demo
// ============================================================

const DEMO_CLIENTES: ClienteData[] = [
  {
    id: 'demo-002',
    email: 'cliente@demo.com',
    nombre: 'Landing Demo',
    plan: 'gratis',
    repoOwner: 'Taroscopo',
    repoName: 'WEB-PRUEBA-CMS',
    repoBranch: 'main',
    totalCambios: 2,
  },
  {
    id: 'demo-003',
    email: 'premium@demo.com',
    nombre: 'Taroscopo — Web Prueba CMS',
    plan: 'anual',
    repoOwner: 'Taroscopo',
    repoName: 'WEB-PRUEBA-CMS',
    repoBranch: 'main',
    totalCambios: 14,
  },
  {
    id: 'demo-004',
    email: 'maria@empresa.co',
    nombre: 'Corp Site María',
    plan: 'anual',
    repoOwner: 'Taroscopo',
    repoName: 'WEB-PRUEBA-CMS',
    repoBranch: 'main',
    totalCambios: 8,
  },
  {
    id: 'demo-005',
    email: 'carlos@startup.io',
    nombre: 'Startup Carlos',
    plan: 'gratis',
    repoOwner: 'Taroscopo',
    repoName: 'WEB-PRUEBA-CMS',
    repoBranch: 'main',
    totalCambios: 3,
  },
];

// ============================================================
// GET /api/admin/clientes
// ============================================================

export async function GET() {
  try {
    // ----------------------------------------------------------
    // RUTA REAL: Supabase está configurado
    // ----------------------------------------------------------
    if (isSupabaseConfigured) {
      const { data: clientes, error: clientesError } = await supabase
        .from('clientes')
        .select('id, email, nombre_sitio, plan, repo_owner, repo_name, repo_branch')
        .order('creado_en', { ascending: true });

      if (clientesError) {
        console.error('[API Clientes] Error consultando clientes:', clientesError);
        return NextResponse.json(
          { success: false, error: 'Error consultando clientes' },
          { status: 500 }
        );
      }

      if (!clientes || clientes.length === 0) {
        return NextResponse.json({ success: true, clientes: [] });
      }

      // Mapear filas a la interfaz de respuesta
      const resultado: ClienteData[] = (clientes as ClienteRow[]).map((row) => ({
        id: row.id,
        email: row.email,
        nombre: row.nombre_sitio || row.email.split('@')[0],
        plan: row.plan,
        repoOwner: row.repo_owner,
        repoName: row.repo_name,
        repoBranch: row.repo_branch,
        totalCambios: 0, // Se podría consultar cambios_log si se necesita
      }));

      return NextResponse.json({ success: true, clientes: resultado });
    }

    // ----------------------------------------------------------
    // RUTA FALLBACK: Modo Demo
    // ----------------------------------------------------------
    return NextResponse.json({ success: true, clientes: DEMO_CLIENTES });
  } catch (error) {
    console.error('[API Clientes] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
