import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured, type ClienteRow } from '@/lib/supabase';
import { ensureVercelJson } from '@/lib/github-write';

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

// ============================================================
// POST /api/admin/clientes — Registrar nuevo cliente
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, nombre, repoOwner, repoName, repoBranch, password } = body;

    if (!email || !nombre || !repoOwner || !repoName || !password) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos obligatorios (email, nombre, repoOwner, repoName, password)' },
        { status: 400 }
      );
    }

    const branch = repoBranch || 'main';

    // ----------------------------------------------------------
    // RUTA REAL: Supabase está configurado
    // ----------------------------------------------------------
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('clientes')
        .insert({
          email,
          nombre_sitio: nombre,
          repo_owner: repoOwner,
          repo_name: repoName,
          repo_branch: branch,
          plan: 'gratis',
          password
        })
        .select()
        .single();

      if (error) {
        console.error('[API Clientes POST] Error insertando en Supabase:', error.message);
        
        // Error de clave duplicada (violación de unicidad en email)
        if (error.code === '23505') {
          return NextResponse.json(
            { success: false, error: 'Ya existe un cliente registrado con ese correo electrónico.' },
            { status: 409 }
          );
        }
        
        return NextResponse.json(
          { success: false, error: `Error de base de datos: ${error.message}` },
          { status: 500 }
        );
      }

      const row = data as ClienteRow;

      // Asegurar que vercel.json existe en el repositorio del cliente
      try {
        await ensureVercelJson(row.repo_owner, row.repo_name, row.repo_branch);
      } catch (err) {
        console.error('[API Clientes POST] Error al crear vercel.json:', err);
      }

      return NextResponse.json({
        success: true,
        cliente: {
          id: row.id,
          email: row.email,
          nombre: row.nombre_sitio || row.email.split('@')[0],
          plan: row.plan,
          repoOwner: row.repo_owner,
          repoName: row.repo_name,
          repoBranch: row.repo_branch,
          totalCambios: 0
        }
      });
    }

    // ----------------------------------------------------------
    // RUTA FALLBACK: Modo Demo (simula inserción exitosa)
    // ----------------------------------------------------------
    return NextResponse.json({
      success: true,
      cliente: {
        id: `demo-${Date.now()}`,
        email,
        nombre,
        plan: 'gratis',
        repoOwner,
        repoName,
        repoBranch: branch,
        totalCambios: 0
      }
    });
  } catch (error) {
    console.error('[API Clientes POST] Error interno:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor al crear cliente' },
      { status: 500 }
    );
  }
}
