// ============================================================
// PALACIO CMS — Ruta API: Cargar Editor
// ============================================================
// GET /api/editor/load?sustratoId=xxx
//
// Flujo:
//   1. Recibe el ID del cliente (sustratoId) como query param
//   2. Consulta Supabase tabla 'clientes' para obtener
//      repo_owner, repo_name y repo_branch
//   3. Usa el conector de GitHub para descargar index.html
//   4. Usa el parser para extraer los campos editables
//   5. Retorna el inventario completo al VisualEditor
//
// Si la descarga falla → retorna error real, NUNCA inventa datos
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { downloadIndexHtml } from '@/lib/github';
import { parseEditableSections, type SeccionParseada } from '@/lib/html-parser';
import { supabase, isSupabaseConfigured, type ClienteRow } from '@/lib/supabase';
import * as cheerio from 'cheerio';

// ============================================================
// Tipos de respuesta
// ============================================================

interface SustratoInfo {
  id: string;
  nombre: string;
  repoOwner: string;
  repoName: string;
  repoBranch: string;
  estadoSuscripcion: 'gratis' | 'anual';
  cambiosEsteMes: number;
  colorPrimario: string;
}

interface LoadSuccessResponse {
  success: true;
  sustrato: SustratoInfo;
  secciones: SeccionParseada[];
  html: string;
  totalCampos: number;
  source: 'github' | 'demo';
  historial?: Array<{ campo_id: string; valor: string; creado_en: string }>;
}

interface LoadErrorResponse {
  success: false;
  error: string;
}

// ============================================================
// Datos demo para modo fallback (sin Supabase)
// Solo define METADATOS del sustrato (nombre, repo, plan).
// El HTML siempre viene del repositorio real.
// ============================================================

const DEMO_SUTRATOS: Record<
  string,
  {
    nombre: string;
    repoOwner: string;
    repoName: string;
    repoBranch: string;
    estadoSuscripcion: 'gratis' | 'anual';
    cambiosEsteMes: number;
    colorPrimario: string;
  }
> = {
  'demo-s1': {
    nombre: 'Taroscopo — Web Prueba CMS',
    repoOwner: 'Taroscopo',
    repoName: 'WEB-PRUEBA-CMS',
    repoBranch: 'main',
    estadoSuscripcion: 'gratis',
    cambiosEsteMes: 1,
    colorPrimario: '#111111',
  },
  'demo-s2': {
    nombre: 'Taroscopo — Web Prueba CMS',
    repoOwner: 'Taroscopo',
    repoName: 'WEB-PRUEBA-CMS',
    repoBranch: 'main',
    estadoSuscripcion: 'anual',
    cambiosEsteMes: 14,
    colorPrimario: '#0e7490',
  },
};

// ============================================================
// Caché en memoria — TTL: 5 minutos
// ============================================================

interface CacheEntry {
  response: LoadSuccessResponse;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 0; // Desactivado para evitar retrasos de sincronización de cambios

// ============================================================
// Reescritura de URLs relativas → absolutas
// ============================================================

function isRelativeUrl(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('javascript:')
  ) {
    return false;
  }
  return true;
}

function rawToJsdelivr(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    if (url.hostname !== 'raw.githubusercontent.com') return rawUrl;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 4) return rawUrl;
    const owner = parts[0];
    const repo = parts[1];
    const branch = parts[2];
    const filePath = parts.slice(3).join('/');
    return `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${filePath}`;
  } catch {
    return rawUrl;
  }
}

function rewriteRelativeUrls(html: string, baseUrl: string): string {
  const $ = cheerio.load(html);

  let cssCount = 0;
  let jsCount = 0;
  let imgCount = 0;

  $('link[href]').each((_index, element) => {
    const el = $(element);
    const href = el.attr('href');
    if (href && isRelativeUrl(href)) {
      const absoluteUrl = `${baseUrl}/${href.replace(/^\.\//, '')}`;
      el.attr('href', rawToJsdelivr(absoluteUrl));
      cssCount++;
    }
  });

  $('script[src]').each((_index, element) => {
    const el = $(element);
    const src = el.attr('src');
    if (src && isRelativeUrl(src)) {
      const absoluteUrl = `${baseUrl}/${src.replace(/^\.\//, '')}`;
      el.attr('src', rawToJsdelivr(absoluteUrl));
      jsCount++;
    }
  });

  $('img[src]').each((_index, element) => {
    const el = $(element);
    const src = el.attr('src');
    if (src && isRelativeUrl(src)) {
      const absoluteUrl = `${baseUrl}/${src.replace(/^\.\//, '')}`;
      el.attr('src', absoluteUrl);
      imgCount++;
    }
  });

  $('a[href]').each((_index, element) => {
    const el = $(element);
    const href = el.attr('href');
    if (href && isRelativeUrl(href) && !href.startsWith('#')) {
      const absoluteUrl = `${baseUrl}/${href.replace(/^\.\//, '')}`;
      el.attr('href', absoluteUrl);
    }
  });

  // Tailwind CDN
  const tailwindCdn = '<script src="https://cdn.tailwindcss.com"><\/script>';
  const head = $('head');
  if (head.length > 0) {
    head.prepend(tailwindCdn);
  } else {
    $('html').prepend(tailwindCdn);
  }

  // Palacio interactive listener (focus/blur/click)
  const palacioListener = `<script>
(function() {
  var _pEl = null;
  var _pPrev = {};

  function _pFind(id) {
    var el = document.getElementById(id);
    if (el) return el;
    var parts = id.split('-');
    for (var i = parts.length - 1; i > 0; i--) {
      var deVal = parts.slice(i).join('-');
      el = document.querySelector('[data-editable="' + deVal + '"]');
      if (el) return el;
    }
    return null;
  }

  function _pClear() {
    if (!_pEl) return;
    _pEl.style.outline = _pPrev.outline || '';
    _pEl.style.outlineOffset = _pPrev.outlineOffset || '';
    _pEl.style.boxShadow = _pPrev.boxShadow || '';
    _pEl.style.transition = _pPrev.transition || '';
    _pEl.style.position = _pPrev.position || '';
    _pEl.style.zIndex = _pPrev.zIndex || '';
    _pEl = null;
  }

  function _pHighlight(el) {
    _pClear();
    _pEl = el;
    _pPrev = {
      outline: el.style.outline,
      outlineOffset: el.style.outlineOffset,
      boxShadow: el.style.boxShadow,
      transition: el.style.transition,
      position: el.style.position,
      zIndex: el.style.zIndex
    };
    el.style.transition = 'all 0.3s ease';
    el.style.outline = '3px solid #06b6d4';
    el.style.outlineOffset = '4px';
    el.style.boxShadow = '0 0 0 8px rgba(6,182,212,0.25), 0 0 24px rgba(6,182,212,0.15)';
    var computed = window.getComputedStyle(el).position;
    if (computed === 'static') {
      el.style.position = 'relative';
    }
    el.style.zIndex = '9999';
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  window.addEventListener('message', function(e) {
    if (!e.data || typeof e.data.type !== 'string') return;
    if (e.data.type === 'palacio-focus') {
      var el = _pFind(e.data.id);
      if (el) _pHighlight(el);
    } else if (e.data.type === 'palacio-blur') {
      _pClear();
    }
  });

  document.addEventListener('click', function(e) {
    var target = e.target;
    while (target && target !== document.body) {
      if (target.hasAttribute && target.hasAttribute('data-editable')) {
        e.preventDefault();
        e.stopPropagation();
        var clickId = target.id || target.getAttribute('data-editable') || '';
        if (clickId) {
          window.parent.postMessage({ type: 'palacio-iframe-click', id: clickId }, '*');
        }
        return;
      }
      target = target.parentElement;
    }
  }, true);
})();
<\/script>`;

  const body = $('body');
  if (body.length > 0) {
    body.append(palacioListener);
  } else {
    $('html').append(palacioListener);
  }

  console.log(
    `[API Editor Load] URLs reescritas: ${cssCount} CSS, ${jsCount} JS, ${imgCount} imgs + Tailwind + Palacio Listener`
  );

  return $.html();
}

// ============================================================
// GET /api/editor/load?sustratoId=xxx
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sustratoId = searchParams.get('sustratoId');

    if (!sustratoId) {
      return NextResponse.json<LoadErrorResponse>(
        { success: false, error: 'El parámetro sustratoId es obligatorio' },
        { status: 400 }
      );
    }

    // ----------------------------------------------------------
    // Paso 0: Verificar caché en memoria
    // ----------------------------------------------------------
    const nocache = searchParams.get('nocache');
    const cached = memoryCache.get(sustratoId);
    if (!nocache && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log(`[API Editor Load] Cache HIT para ${sustratoId}`);
      return NextResponse.json<LoadSuccessResponse>(cached.response);
    }
    if (nocache) {
      console.log(`[API Editor Load] Cache PURGE solicitado para ${sustratoId}`);
      memoryCache.delete(sustratoId);
    }

    // ----------------------------------------------------------
    // Paso 1: Obtener datos del cliente desde Supabase
    // ----------------------------------------------------------
    let repoOwner = '';
    let repoName = '';
    let repoBranch = 'main';
    let sustratoNombre = '';
    let estadoSuscripcion: 'gratis' | 'anual' = 'gratis';
    let cambiosEsteMes = 0;
    let colorPrimario = '#111111';

    if (isSupabaseConfigured) {
      // Consultar tabla 'clientes' por ID
      const { data: cliente, error: clienteError } = await supabase
        .from('clientes')
        .select('id, email, nombre_sitio, plan, repo_owner, repo_name, repo_branch')
        .eq('id', sustratoId)
        .single();

      if (clienteError || !cliente) {
        console.error(
          '[API Editor Load] Cliente no encontrado en Supabase:',
          sustratoId,
          clienteError?.message
        );
        return NextResponse.json<LoadErrorResponse>(
          { success: false, error: 'No se encontró el cliente especificado. Verifica el ID.' },
          { status: 404 }
        );
      }

      const row = cliente as ClienteRow;
      repoOwner = row.repo_owner;
      repoName = row.repo_name;
      repoBranch = row.repo_branch || 'main';
      sustratoNombre = row.nombre_sitio || `${repoOwner}/${repoName}`;
      estadoSuscripcion = (row.plan as 'gratis' | 'anual') || 'gratis';

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

      console.log(
        `[API Editor Load] Cliente encontrado: ${row.email} → ${repoOwner}/${repoName} (${repoBranch})`
      );
    } else {
      // Modo demo: usar metadatos locales del sustrato
      const demo = DEMO_SUTRATOS[sustratoId] ?? DEMO_SUTRATOS['demo-s1'];
      sustratoNombre = demo.nombre;
      repoOwner = demo.repoOwner;
      repoName = demo.repoName;
      repoBranch = demo.repoBranch;
      estadoSuscripcion = demo.estadoSuscripcion;
      cambiosEsteMes = demo.cambiosEsteMes;
      colorPrimario = demo.colorPrimario;
    }

    // ----------------------------------------------------------
    // Paso 2: Descargar index.html desde GitHub
    // ----------------------------------------------------------
    const downloadResult = await downloadIndexHtml(
      repoOwner,
      repoName,
      undefined, // installationId — no usado en flujo simplificado
      repoBranch // rama preferida desde la base de datos
    );

    if (!downloadResult.success) {
      console.error('[API Editor Load] Error descargando HTML:', downloadResult.error);
      return NextResponse.json<LoadErrorResponse>(
        { success: false, error: downloadResult.error },
        { status: 502 }
      );
    }

    const source: 'github' | 'demo' = 'github';

    // ----------------------------------------------------------
    // Paso 3: Reescribir URLs relativas a absolutas + inyectar CDN
    // ----------------------------------------------------------
    const baseUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${downloadResult.branch}`;
    const rewrittenHtml = rewriteRelativeUrls(downloadResult.html, baseUrl);

    // ----------------------------------------------------------
    // Paso 4: Parsear el HTML reescrito y extraer campos editables
    // ----------------------------------------------------------
    const parseResult = parseEditableSections(rewrittenHtml);

    // ----------------------------------------------------------
    // Paso 5: Consultar historial de cambios en Supabase (si está configurado)
    // ----------------------------------------------------------
    let historial: Array<{ campo_id: string; valor: string; creado_en: string }> = [];

    if (isSupabaseConfigured) {
      const { data: logData, error: logError } = await supabase
        .from('cambios_log')
        .select('campo_id, valor, creado_en')
        .eq('cliente_id', sustratoId)
        .order('creado_en', { ascending: false });

      if (!logError && logData) {
        // Filtrar filas que tienen valor guardado
        historial = logData.filter((h: any) => h.valor !== null && h.valor !== undefined);
      }
    }

    // ----------------------------------------------------------
    // Paso 6: Retornar inventario completo al VisualEditor
    // ----------------------------------------------------------
    const responseBody: LoadSuccessResponse = {
      success: true,
      sustrato: {
        id: sustratoId,
        nombre: sustratoNombre,
        repoOwner,
        repoName,
        repoBranch: downloadResult.branch,
        estadoSuscripcion,
        cambiosEsteMes,
        colorPrimario,
      },
      secciones: parseResult.secciones,
      html: rewrittenHtml,
      totalCampos: parseResult.totalCampos,
      source,
      historial,
    };

    memoryCache.set(sustratoId, { response: responseBody, timestamp: Date.now() });

    return NextResponse.json<LoadSuccessResponse>(responseBody);
  } catch (error) {
    console.error('[API Editor Load] Error interno:', error);
    return NextResponse.json<LoadErrorResponse>(
      { success: false, error: 'Error interno del servidor al cargar el editor. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}
