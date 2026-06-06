import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// ============================================================
// PATCH /api/admin/sustratos — Cambiar estado de suscripción
// ============================================================
// Actualiza el plan de un cliente en la tabla 'clientes'.
// ============================================================

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { sustratoId, estadoSuscripcion } = body;

    if (!sustratoId || !estadoSuscripcion) {
      return NextResponse.json(
        { success: false, error: 'sustratoId y estadoSuscripcion son obligatorios' },
        { status: 400 }
      );
    }

    if (!['gratis', 'anual'].includes(estadoSuscripcion)) {
      return NextResponse.json(
        { success: false, error: 'estadoSuscripcion debe ser "gratis" o "anual"' },
        { status: 400 }
      );
    }

    // ----------------------------------------------------------
    // RUTA REAL: Supabase está configurado
    // ----------------------------------------------------------
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('clientes')
        .update({ plan: estadoSuscripcion })
        .eq('id', sustratoId);

      if (error) {
        console.error('[API Sustratos] Error actualizando suscripción:', error);
        return NextResponse.json(
          { success: false, error: 'Error actualizando la suscripción' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, sustratoId, estadoSuscripcion });
    }

    // ----------------------------------------------------------
    // RUTA FALLBACK: Modo Demo (simula éxito)
    // ----------------------------------------------------------
    return NextResponse.json({ success: true, sustratoId, estadoSuscripcion });
  } catch (error) {
    console.error('[API Sustratos] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
