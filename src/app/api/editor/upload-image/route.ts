// ============================================================
// PALACIO CMS — Ruta API: Subir Imagen a GitHub
// ============================================================
// POST /api/editor/upload-image
//
// Flujo completo:
//   1. Validar campos obligatorios y tamaño (4MB)
//   2. Consultar Supabase: datos del cliente + plan
//   3. Contar cambios del mes → si plan=gratis y >=3 → 403
//   4. Subir imagen a GitHub via commitFileToGitHub
//   5. Insertar fila en cambios_log (imagen = 1 crédito)
//   6. Retornar URL absoluta al cliente
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { commitFileToGitHub, hasGitHubToken } from '@/lib/github-write';
import { supabase, isSupabaseConfigured, type ClienteRow } from '@/lib/supabase';

// ============================================================
// Constantes
// ============================================================

const MAX_CHANGES_FREE = 3;

// ============================================================
// Limpiar nombre de archivo
// ============================================================

function cleanFileName(name: string): string {
  const parts = name.lastIndexOf('.');
  const ext = parts !== -1 ? name.slice(parts).toLowerCase() : '';
  const baseName = parts !== -1 ? name.slice(0, parts) : name;

  const cleaned = baseName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]/g, '-')       // Replace non-alphanumeric with dash
    .replace(/-+/g, '-')               // Collapse multiple dashes
    .replace(/^-|-$/g, '');            // Trim leading/trailing dashes

  return `${cleaned}${ext}`;
}

// ============================================================
// Tipos de respuesta
// ============================================================

interface UploadSuccessResponse {
  success: true;
  relativePath: string;
  absoluteUrl: string;
  simulation: boolean;
  cambiosEsteMes: number;
  message?: string;
}

interface UploadErrorResponse {
  success: false;
  error: string;
  cambiosEsteMes?: number;
}

// ============================================================
// POST /api/editor/upload-image
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campoId, sustratoId, fileName, base64 } = body;

    if (!campoId || !sustratoId || !fileName || !base64) {
      return NextResponse.json<UploadErrorResponse>(
        { success: false, error: 'Faltan campos obligatorios (campoId, sustratoId, fileName, base64)' },
        { status: 400 }
      );
    }

    // Validar tamaño (4MB máximo en Base64 ≈ 5.33MB en string)
    const BASE64_MAX = 4 * 1024 * 1024 * 1.33;
    if (base64.length > BASE64_MAX) {
      return NextResponse.json<UploadErrorResponse>(
        { success: false, error: 'La imagen excede el límite de 4MB de Palacio CMS' },
        { status: 400 }
      );
    }

    // Limpiar nombre del archivo
    const cleanedName = cleanFileName(fileName);
    const relativePath = `img/uploads/${cleanedName}`;

    // ----------------------------------------------------------
    // PASO 1: Obtener datos del cliente + plan desde Supabase
    // ----------------------------------------------------------
    let repoOwner = 'Taroscopo';
    let repoName = 'WEB-PRUEBA-CMS';
    let repoBranch = 'main';
    let clienteId = sustratoId;
    let plan: 'gratis' | 'anual' = 'gratis';
    let cambiosEsteMes = 0;

    if (isSupabaseConfigured) {
      const { data: cliente, error: clienteError } = await supabase
        .from('clientes')
        .select('id, email, plan, repo_owner, repo_name, repo_branch')
        .eq('id', sustratoId)
        .single();

      if (clienteError || !cliente) {
        console.error('[API Upload Image] Cliente no encontrado:', sustratoId, clienteError?.message);
        return NextResponse.json<UploadErrorResponse>(
          { success: false, error: 'Cliente no encontrado. Verifica el ID.' },
          { status: 404 }
        );
      }

      const row = cliente as ClienteRow;
      clienteId = row.id;
      repoOwner = row.repo_owner;
      repoName = row.repo_name;
      repoBranch = row.repo_branch || 'main';
      plan = row.plan;

      // Contar cambios del mes actual
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('cambios_log')
        .select('id', { count: 'exact', head: true })
        .eq('cliente_id', row.id)
        .gte('creado_en', inicioMes.toISOString());

      cambiosEsteMes = count ?? 0;

      console.log(`[API Upload Image] Cliente: ${row.email} | Plan: ${plan} | Cambios este mes: ${cambiosEsteMes}`);
    } else {
      console.warn('[API Upload Image] Supabase no configurado — Saltando verificación de plan');
    }

    // ----------------------------------------------------------
    // PASO 2: RESTRICCIÓN DE PLANES (igual que /api/editor/save)
    // Si plan === "gratis" y cambios >= MAX_CHANGES_FREE → 403
    // ----------------------------------------------------------
    if (plan === 'gratis' && cambiosEsteMes >= MAX_CHANGES_FREE) {
      console.warn(`[API Upload Image] BLOQUEADO — Plan gratis con ${cambiosEsteMes}/${MAX_CHANGES_FREE} cambios`);
      return NextResponse.json<UploadErrorResponse>(
        {
          success: false,
          error: 'Suscripción agotada. Pásate al plan anual para realizar cambios ilimitados.',
          cambiosEsteMes,
        },
        { status: 403 }
      );
    }

    // ----------------------------------------------------------
    // PASO 3: Subir imagen a GitHub via REST API
    // ----------------------------------------------------------
    const absoluteUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${repoBranch}/${relativePath}`;

    if (!hasGitHubToken) {
      console.warn('[API Upload Image] GITHUB_TOKEN no configurado — Modo simulación');
      return NextResponse.json<UploadSuccessResponse>({
        success: true,
        relativePath: absoluteUrl,
        absoluteUrl,
        simulation: true,
        cambiosEsteMes,
        message: 'Modo Simulación: GITHUB_TOKEN pendiente en .env',
      });
    }

    const commitResult = await commitFileToGitHub({
      repoOwner,
      repoName,
      branch: repoBranch,
      filePath: relativePath,
      content: base64,       // Ya viene en Base64 del cliente
      isBase64: true,        // No volver a codificar
      message: `Palacio CMS: Upload image ${cleanedName}`,
    });

    if (!commitResult.success) {
      console.error('[API Upload Image] Error subiendo a GitHub:', commitResult.error);
      return NextResponse.json<UploadErrorResponse>(
        { success: false, error: `Error al subir imagen a GitHub: ${commitResult.error}` },
        { status: 502 }
      );
    }

    const isSimulation = commitResult.simulation === true;

    if (isSimulation) {
      console.warn('[API Upload Image] MODO SIMULACIÓN — Imagen no persistida en GitHub');
    } else {
      console.log(`[API Upload Image] Imagen subida exitosamente: ${relativePath} → ${commitResult.sha?.slice(0, 7) ?? 'sin-sha'}`);
    }

    // ----------------------------------------------------------
    // PASO 4: Registrar en cambios_log (Supabase)
    // La subida de imagen = 1 crédito del plan
    // ----------------------------------------------------------
    if (isSupabaseConfigured) {
      const { error: logError } = await supabase
        .from('cambios_log')
        .insert({
          cliente_id: clienteId,
          seccion: 'imagen',
          campo_id: campoId,
        });

      if (logError) {
        console.error('[API Upload Image] Error insertando en cambios_log:', logError.message);
        // No fallar la operación — el commit ya se hizo
      } else {
        // Recalcular conteo después de la inserción
        const inicioMes = new Date();
        inicioMes.setDate(1);
        inicioMes.setHours(0, 0, 0, 0);

        const { count: newCount } = await supabase
          .from('cambios_log')
          .select('id', { count: 'exact', head: true })
          .eq('cliente_id', clienteId)
          .gte('creado_en', inicioMes.toISOString());

        cambiosEsteMes = newCount ?? cambiosEsteMes + 1;
        console.log(`[API Upload Image] Registro insertado en cambios_log. Total mes: ${cambiosEsteMes}`);
      }
    } else {
      cambiosEsteMes += 1;
    }

    // ----------------------------------------------------------
    // PASO 5: Retornar respuesta exitosa
    // ----------------------------------------------------------
    return NextResponse.json<UploadSuccessResponse>({
      success: true,
      relativePath: absoluteUrl,
      absoluteUrl,
      simulation: isSimulation,
      cambiosEsteMes,
      message: isSimulation
        ? 'Modo Simulación: Imagen guardada localmente'
        : 'Imagen subida exitosamente a GitHub',
    });
  } catch (error) {
    console.error('[API Upload Image] Error interno:', error);
    return NextResponse.json<UploadErrorResponse>(
      { success: false, error: 'Error interno del servidor al subir imagen' },
      { status: 500 }
    );
  }
}
