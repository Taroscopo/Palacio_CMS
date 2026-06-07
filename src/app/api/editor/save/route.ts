// ============================================================
// PALACIO CMS — Ruta API: Guardar Cambios (FASE 4)
// ============================================================
// POST /api/editor/save
//
// Flujo completo:
//   1. Validar sustratoId
//   2. Consultar Supabase: datos del cliente (plan, repo_owner, repo_name, repo_branch)
//   3. Contar cambios del mes actual en cambios_log
//   4. Si plan === "gratis" && cambios >= MAX_CHANGES_FREE → 403
//   5. Descargar index.html original desde GitHub
//   6. Aplicar cambios con Cheerio (campos, banner, visibilidad, orden)
//   7. Commit del HTML modificado a GitHub (o simulación)
//   8. Insertar filas en cambios_log por cada campo modificado
//   9. Retornar éxito con conteo actualizado
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { downloadHtmlLight, commitFileToGitHub } from '@/lib/github-write';
import { supabase, isSupabaseConfigured, type ClienteRow } from '@/lib/supabase';

// ============================================================
// Constantes
// ============================================================

const MAX_CHANGES_FREE = 3;

// ============================================================
// Tipos del request
// ============================================================

interface BannerPromocional {
  activo: boolean;
  texto: string;
  colorFondo: string;
  textoBoton: string;
  enlaceBoton: string;
  posicion: number;
  alineacion: 'izquierda' | 'centro' | 'derecha';
  pesoTipografico: 'normal' | 'negrita' | 'super-negrita';
}

interface SaveRequestBody {
  sustratoId: string;
  camposEditados: Record<string, string>;
  banner?: BannerPromocional;
  colorPrimario?: string;
  seccionVisibility?: Record<string, boolean>;
  seccionOrder?: Record<string, number>;
}

// ============================================================
// Tipos de respuesta
// ============================================================

interface SaveSuccessResponse {
  success: true;
  simulation: boolean;
  cambiosEsteMes: number;
  camposModificados: number;
  message?: string;
}

interface SaveErrorResponse {
  success: false;
  error: string;
  cambiosEsteMes?: number;
}

// ============================================================
// Aplicar cambios al HTML con Cheerio (server-side)
// ============================================================

interface CampoConSeccion {
  campoId: string;
  seccion: string;
  valorOriginal: string;
}

function applyChangesToHtml(
  html: string,
  camposEditados: Record<string, string>,
  banner: BannerPromocional | null,
  seccionVisibility: Record<string, boolean> | null,
  seccionOrder: Record<string, number> | null
): { html: string; camposConSeccion: CampoConSeccion[] } {
  const $ = cheerio.load(html);
  const camposConSeccion: CampoConSeccion[] = [];

  // ----------------------------------------------------------
  // 1. Aplicar cambios de campos editables
  // ----------------------------------------------------------
  for (const [campoId, nuevoValor] of Object.entries(camposEditados)) {
    // Buscar elemento por id (atributo selector evita problemas con CSS especiales)
    let el = $(`[id="${campoId}"]`);

    // Si no se encuentra por id, buscar por data-editable
    if (el.length === 0) {
      el = $(`[data-editable="${campoId}"]`);
    }

    // Si aún no se encuentra, intentar extraer data-editable del campoId compuesto
    // (ej: "hero-titulo-0" → intentar "titulo")
    if (el.length === 0) {
      const parts = campoId.split('-');
      for (let i = 1; i < parts.length; i++) {
        const possibleEditable = parts.slice(i).join('-');
        el = $(`[data-editable="${possibleEditable}"]`);
        if (el.length > 0) break;
      }
    }

    if (el.length === 0) {
      console.warn(`[API Save] Elemento no encontrado para campoId: ${campoId}`);
      continue;
    }

    // Detectar sección (data-section propio o del ancestro más cercano)
    const ownSection = el.attr('data-section');
    const parentSection = el.closest('[data-section]').attr('data-section');
    const seccion = ownSection || parentSection || 'general';

    // Detectar tipo de elemento y aplicar cambio
    const tagName = el.prop('tagName')?.toLowerCase() ?? '';
    let valorOriginal = '';

    if (tagName === 'img') {
      // Para imágenes: actualizar src
      valorOriginal = el.attr('src') ?? '';
      el.attr('src', nuevoValor);
    } else if (tagName === 'iframe') {
      // Para iframes (como recorridos 360): actualizar src
      valorOriginal = el.attr('src') ?? '';
      el.attr('src', nuevoValor);
    } else if (tagName === 'a') {
      // Para enlaces: actualizar href si es mailto o tel, sino actualizar href preservando el contenido
      const currentHref = el.attr('href') ?? '';
      if (currentHref.startsWith('mailto:')) {
        valorOriginal = currentHref.replace('mailto:', '');
        el.attr('href', `mailto:${nuevoValor}`);
        el.text(nuevoValor);
      } else if (currentHref.startsWith('tel:')) {
        valorOriginal = currentHref.replace('tel:', '');
        el.attr('href', `tel:${nuevoValor}`);
        el.text(nuevoValor);
      } else {
        // Enlace general (como WhatsApp o Instagram): actualizamos el href (URL) y preservamos el texto interno
        valorOriginal = el.attr('href') ?? '';
        el.attr('href', nuevoValor);
      }
    } else {
      // Para texto, títulos, etc: actualizar contenido de texto
      valorOriginal = el.text() ?? '';
      el.text(nuevoValor);
    }

    camposConSeccion.push({ campoId, seccion, valorOriginal });
  }

  // ----------------------------------------------------------
  // 2. Aplicar cambios del banner promocional
  // ----------------------------------------------------------
  if (banner) {
    const existingBanner = $('[data-palacio-banner]');

    if (banner.activo) {
      // Crear banner si no existe
      if (existingBanner.length === 0) {
        $('body').prepend('<div data-palacio-banner="true" class="palacio-banner"></div>');
      }

      // Re-seleccionar (ahora existe seguro)
      const bannerEl = $('[data-palacio-banner]');

      // Alineación
      const alignMap: Record<string, string> = {
        izquierda: 'left',
        centro: 'center',
        derecha: 'right',
      };

      // Peso tipográfico
      const weightMap: Record<string, string> = {
        normal: '400',
        negrita: '700',
        'super-negrita': '900',
      };

      bannerEl.css('background-color', banner.colorFondo);
      bannerEl.css('text-align', alignMap[banner.alineacion] || 'left');
      bannerEl.css('font-weight', weightMap[banner.pesoTipografico] || '400');
      bannerEl.css('padding', '12px 20px');
      bannerEl.css('display', 'flex');
      bannerEl.css('align-items', 'center');
      bannerEl.css('justify-content', banner.alineacion === 'centro' ? 'center' : banner.alineacion === 'derecha' ? 'flex-end' : 'flex-start');
      bannerEl.css('gap', '16px');
      bannerEl.css('color', '#ffffff');
      bannerEl.css('font-size', '14px');
      bannerEl.css('width', '100%');
      bannerEl.css('box-sizing', 'border-box');

      // Contenido del banner
      let bannerHtml = `<span>${banner.texto}</span>`;
      if (banner.textoBoton) {
        bannerHtml += `<a href="${banner.enlaceBoton || '#'}" style="display:inline-block;padding:6px 16px;background:rgba(255,255,255,0.2);color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;white-space:nowrap">${banner.textoBoton}</a>`;
      }
      bannerEl.html(bannerHtml);
    } else if (existingBanner.length > 0) {
      // Desactivado: eliminar banner
      existingBanner.remove();
    }
  }

  // ----------------------------------------------------------
  // 3. Aplicar visibilidad de secciones
  // ----------------------------------------------------------
  if (seccionVisibility) {
    for (const [seccion, visible] of Object.entries(seccionVisibility)) {
      const sectionEl = $(`[data-section="${seccion}"]`);
      if (sectionEl.length > 0) {
        if (visible) {
          sectionEl.css('display', '');
        } else {
          sectionEl.css('display', 'none');
        }
      }
    }
  }

  // ----------------------------------------------------------
  // 4. Aplicar orden de secciones
  // ----------------------------------------------------------
  if (seccionOrder) {
    // Agregar estilo de orden CSS a cada sección
    for (const [seccion, orden] of Object.entries(seccionOrder)) {
      const sectionEl = $(`[data-section="${seccion}"]`);
      if (sectionEl.length > 0) {
        sectionEl.attr('data-section-order', String(orden));
        sectionEl.css('order', String(orden));
      }
    }

    // Asegurar que el contenedor padre sea flex para que order funcione
    // Buscar el padre común de todas las secciones data-section
    const firstSection = $('[data-section]').first();
    if (firstSection.length > 0) {
      const parent = firstSection.parent();
      if (parent.length > 0) {
        const currentDisplay = parent.css('display') || '';
        if (currentDisplay !== 'flex' && currentDisplay !== 'inline-flex') {
          parent.css('display', 'flex');
          parent.css('flex-direction', 'column');
        }
      }
    }
  }

  return { html: $.html(), camposConSeccion };
}

// ============================================================
// POST /api/editor/save
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body: SaveRequestBody = await request.json();
    const { sustratoId, camposEditados, banner, colorPrimario, seccionVisibility, seccionOrder } = body;

    if (!sustratoId) {
      return NextResponse.json<SaveErrorResponse>(
        { success: false, error: 'El parámetro sustratoId es obligatorio' },
        { status: 400 }
      );
    }

    // ----------------------------------------------------------
    // PASO 1: Consultar datos del cliente en Supabase
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
        console.error('[API Save] Cliente no encontrado en Supabase:', sustratoId, clienteError?.message);
        return NextResponse.json<SaveErrorResponse>(
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

      console.log(`[API Save] Cliente: ${row.email} | Plan: ${plan} | Cambios este mes: ${cambiosEsteMes}`);
    } else {
      // Modo fallback sin Supabase: no hay restricción de plan
      console.warn('[API Save] Supabase no configurado — Saltando verificación de plan');
    }

    // ----------------------------------------------------------
    // PASO 2: RESTRICCIÓN DE PLANES
    // Si plan === "gratis" y cambios >= MAX_CHANGES_FREE → 403
    // ----------------------------------------------------------
    if (plan === 'gratis' && cambiosEsteMes >= MAX_CHANGES_FREE) {
      console.warn(`[API Save] BLOQUEADO — Plan gratis con ${cambiosEsteMes}/${MAX_CHANGES_FREE} cambios`);
      return NextResponse.json<SaveErrorResponse>(
        {
          success: false,
          error: 'Suscripción agotada. Pásate al plan anual para realizar cambios ilimitados.',
          cambiosEsteMes,
        },
        { status: 403 }
      );
    }

    // ----------------------------------------------------------
    // PASO 3: Descargar index.html original desde GitHub
    // ----------------------------------------------------------
    const downloadResult = await downloadHtmlLight(repoOwner, repoName, repoBranch);

    if (!downloadResult.success) {
      console.error('[API Save] Error descargando HTML:', downloadResult.error);
      return NextResponse.json<SaveErrorResponse>(
        { success: false, error: downloadResult.error },
        { status: 502 }
      );
    }

    const originalHtml = downloadResult.html;

    // ----------------------------------------------------------
    // PASO 4: Aplicar cambios con Cheerio (server-side)
    // ----------------------------------------------------------
    const { html: modifiedHtml, camposConSeccion } = applyChangesToHtml(
      originalHtml,
      camposEditados || {},
      banner || null,
      seccionVisibility || null,
      seccionOrder || null
    );

    const camposModificados = camposConSeccion.length;

    // Si no hay cambios aplicados, retornar sin commit
    if (camposModificados === 0 && !banner && !seccionVisibility && !seccionOrder) {
      return NextResponse.json<SaveSuccessResponse>({
        success: true,
        simulation: false,
        cambiosEsteMes,
        camposModificados: 0,
        message: 'No se detectaron cambios para guardar',
      });
    }

    // ----------------------------------------------------------
    // PASO 5: Commit del HTML modificado a GitHub
    // ----------------------------------------------------------
    const commitResult = await commitFileToGitHub({
      repoOwner,
      repoName,
      branch: downloadResult.branch,
      filePath: 'index.html',
      content: modifiedHtml,
      message: `Palacio CMS: Editar ${camposModificados} campo${camposModificados !== 1 ? 's' : ''}${banner?.activo ? ' + banner' : ''}`,
    });

    if (!commitResult.success) {
      console.error('[API Save] Error en commit a GitHub:', commitResult.error);
      return NextResponse.json<SaveErrorResponse>(
        { success: false, error: `Error al guardar en GitHub: ${commitResult.error}` },
        { status: 502 }
      );
    }

    const isSimulation = commitResult.simulation === true;

    if (isSimulation) {
      console.warn('[API Save] MODO SIMULACIÓN — Cambios no persistidos en GitHub');
    } else {
      console.log(`[API Save] Commit exitoso a GitHub: ${commitResult.sha ?? 'sin SHA'}`);
    }

    // ----------------------------------------------------------
    // PASO 6: Registrar cambios en cambios_log (Supabase)
    // Una fila por cada campo modificado
    // ----------------------------------------------------------
    if (isSupabaseConfigured && camposConSeccion.length > 0) {
      // 1. Consultar si los campos ya tienen historial de cambios guardado con valor
      const campoIds = camposConSeccion.map(c => c.campoId);
      let fieldsWithLogs = new Set<string>();

      try {
        const { data: existingLogs, error: checkError } = await supabase
          .from('cambios_log')
          .select('campo_id')
          .eq('cliente_id', clienteId)
          .in('campo_id', campoIds);

        if (!checkError && existingLogs) {
          fieldsWithLogs = new Set(existingLogs.map(l => l.campo_id));
        }
      } catch (err) {
        console.error('[API Save] Error al consultar logs existentes:', err);
      }

      const logRows: any[] = [];
      const ahora = new Date();

      camposConSeccion.forEach(({ campoId, seccion, valorOriginal }) => {
        // Si es la primera vez que se edita este campo en la base de datos, guardar la versión original primero
        if (!fieldsWithLogs.has(campoId)) {
          const timestampOriginal = new Date(ahora.getTime() - 1000);
          logRows.push({
            cliente_id: clienteId,
            seccion,
            campo_id: campoId,
            valor: valorOriginal,
            creado_en: timestampOriginal.toISOString()
          });
        }

        // Registrar el nuevo cambio
        logRows.push({
          cliente_id: clienteId,
          seccion,
          campo_id: campoId,
          valor: camposEditados[campoId] || '',
          creado_en: ahora.toISOString()
        });
      });

      const { error: logError } = await supabase
        .from('cambios_log')
        .insert(logRows);

      if (logError) {
        console.error('[API Save] Error insertando en cambios_log:', logError.message);
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

        cambiosEsteMes = newCount ?? cambiosEsteMes + logRows.length;

        console.log(
          `[API Save] ${logRows.length} registro(s) insertados en cambios_log. Total mes: ${cambiosEsteMes}`
        );
      }
    } else if (!isSupabaseConfigured && camposConSeccion.length > 0) {
      // Modo fallback: incrementar contador local
      cambiosEsteMes += camposConSeccion.length;
    }

    // ----------------------------------------------------------
    // PASO 7: Retornar respuesta exitosa
    // ----------------------------------------------------------
    return NextResponse.json<SaveSuccessResponse>({
      success: true,
      simulation: isSimulation,
      cambiosEsteMes,
      camposModificados,
      message: isSimulation
        ? 'Modo Simulación: Cambios guardados localmente (GitHub sin configurar)'
        : `Cambios guardados exitosamente en GitHub`,
    });
  } catch (error) {
    console.error('[API Save] Error interno:', error);
    return NextResponse.json<SaveErrorResponse>(
      { success: false, error: 'Error interno del servidor al guardar cambios' },
      { status: 500 }
    );
  }
}
