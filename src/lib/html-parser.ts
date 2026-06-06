// ============================================================
// PALACIO CMS — Parser de Contenido HTML
// ============================================================
// Utiliza Cheerio para procesar HTML crudo descargado desde
// GitHub y extraer automáticamente todos los elementos que
// tengan los atributos `data-section` y/o `data-editable`.
//
// Soporta dos patrones de marcado:
//   A) Ambos atributos en el mismo elemento:
//      <h1 data-section="hero" data-editable="titulo">...</h1>
//   B) Atributos separados (padre/hijo):
//      <section data-section="hero">
//        <h1 data-editable="titulo">...</h1>
//        <p data-editable="subtitulo">...</p>
//      </section>
//
// El resultado es un inventario estructurado de secciones y
// campos editables listo para ser consumido por VisualEditor.
// ============================================================

import * as cheerio from 'cheerio';
import type { Element as DomElement } from 'domhandler';

// ============================================================
// Tipos exportados
// ============================================================

/** Tipos de campo editables que el parser puede identificar */
export type TipoCampo =
  | 'titulo'
  | 'texto'
  | 'imagen'
  | 'enlace'
  | 'email'
  | 'telefono'
  | 'html';

/** Un campo individual extraído del HTML */
export interface CampoEditable {
  /** Identificador único del elemento (del atributo id o generado) */
  id: string;
  /** Tipo de campo inferido del tag o del valor de data-editable */
  tipoCampo: TipoCampo;
  /** Sección a la que pertenece (valor de data-section) */
  seccion: string;
  /** Texto actual del elemento (o src/alt para imágenes) */
  textoActual: string;
  /** Nombre de la etiqueta HTML original */
  etiquetaHtml: string;
  /** Atributos relevantes del elemento (src, href, alt, etc.) */
  atributos: Record<string, string>;
}

/** Una sección agrupada de campos editables */
export interface SeccionParseada {
  /** Nombre/identificador de la sección (valor de data-section) */
  seccion: string;
  /** Orden de aparición en el documento HTML */
  orden: number;
  /** Campos editables dentro de esta sección */
  campos: CampoEditable[];
}

/** Resultado completo del parseo */
export interface ParseResult {
  /** Secciones encontradas, ordenadas por aparición */
  secciones: SeccionParseada[];
  /** Total de campos editables en todo el documento */
  totalCampos: number;
}

// ============================================================
// Inferencia del tipo de campo
// ============================================================

/** Valores de data-editable que mapean directamente a un TipoCampo */
const TIPO_MAP: Record<string, TipoCampo> = {
  titulo: 'titulo',
  subtitulo: 'texto',
  texto: 'texto',
  imagen: 'imagen',
  enlace: 'enlace',
  email: 'email',
  telefono: 'telefono',
  html: 'html',
  // Alias comunes
  title: 'titulo',
  subtitle: 'texto',
  image: 'imagen',
  link: 'enlace',
  phone: 'telefono',
  description: 'texto',
  descripcion: 'texto',
  cta: 'enlace',
  cta_enlace: 'enlace',
  cta_texto: 'texto',
  // Alias para el patrón padre/hijo donde data-editable="text"
  text: 'texto',
};

/**
 * Infiere el tipo de campo a partir del valor de `data-editable`
 * y, como respaldo, del tipo de etiqueta HTML.
 */
function inferirTipoCampo(
  el: cheerio.Cheerio<DomElement>,
  dataEditable: string
): TipoCampo {
  const normalizedEditable = dataEditable.toLowerCase().trim();

  // 1. Verificar si el valor de data-editable mapea directamente
  if (TIPO_MAP[normalizedEditable]) {
    return TIPO_MAP[normalizedEditable];
  }

  // 2. Verificar prefijos comunes (elem-1-titulo, elem-2-imagen, etc.)
  const parts = normalizedEditable.split('-');
  const lastPart = parts[parts.length - 1];
  if (TIPO_MAP[lastPart]) {
    return TIPO_MAP[lastPart];
  }

  // 3. Inferir del tipo de etiqueta HTML
  const tagName = el.prop('tagName')?.toLowerCase() ?? '';

  if (tagName === 'img') return 'imagen';
  if (tagName === 'a') {
    const href = el.attr('href') ?? '';
    if (href.startsWith('mailto:')) return 'email';
    return 'enlace';
  }
  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) return 'titulo';
  if (tagName === 'span' || tagName === 'p') return 'texto';

  // 4. Default: texto genérico
  return 'texto';
}

// ============================================================
// Extracción de atributos relevantes
// ============================================================

/** Atributos HTML que se preservan en el resultado del parser */
const ATRIBUTOS_RELEVANTES = [
  'src',
  'href',
  'alt',
  'title',
  'placeholder',
  'class',
  'style',
  'target',
  'width',
  'height',
];

/**
 * Extrae los atributos relevantes de un elemento Cheerio
 * y los devuelve como un diccionario plano.
 */
function extraerAtributos(
  el: cheerio.Cheerio<DomElement>
): Record<string, string> {
  const attrs: Record<string, string> = {};

  for (const attr of ATRIBUTOS_RELEVANTES) {
    const value = el.attr(attr);
    if (value !== undefined) {
      attrs[attr] = value;
    }
  }

  return attrs;
}

// ============================================================
// Función principal: parseEditableSections
// ============================================================

/**
 * Parsea un documento HTML crudo y extrae todos los elementos
 * editables, agrupándolos por sección.
 *
 * Soporta dos patrones de marcado:
 *   A) Ambos atributos en el mismo elemento:
 *      <h1 data-section="hero" data-editable="titulo">...</h1>
 *   B) Atributos separados (padre con data-section, hijo con data-editable):
 *      <section data-section="hero">
 *        <h1 data-editable="titulo">...</h1>
 *        <p data-editable="subtitulo">...</p>
 *      </section>
 *
 * Para el patrón B, busca el ancestro más cercano con data-section.
 * Si un elemento data-editable no tiene ancestro con data-section,
 * se asigna a la sección "general".
 *
 * @param html - Código HTML crudo descargado desde GitHub
 * @returns Inventario estructurado de secciones y campos editables
 */
export function parseEditableSections(html: string): ParseResult {
  const $ = cheerio.load(html);

  // Mapa de sección → campos
  const seccionMap = new Map<string, CampoEditable[]>();
  // Mapa de sección → orden de primera aparición
  const ordenSeccion = new Map<string, number>();
  let ordenGlobal = 0;

  /**
   * Registra una sección en el mapa de orden si aún no existe.
   */
  function registrarSeccion(seccion: string): void {
    if (!ordenSeccion.has(seccion)) {
      ordenSeccion.set(seccion, ordenGlobal++);
    }
    if (!seccionMap.has(seccion)) {
      seccionMap.set(seccion, []);
    }
  }

  // ----------------------------------------------------------
  // PASO 1: Elementos con AMBOS atributos (patrón A)
  // ----------------------------------------------------------
  $('[data-section][data-editable]').each((index, element) => {
    const el = $(element);
    const seccion = el.attr('data-section') ?? 'general';
    const dataEditable = el.attr('data-editable') ?? 'texto';

    registrarSeccion(seccion);

    const elementId = el.attr('id') ?? `${seccion}-${dataEditable}-${index}`;
    const tipoCampo = inferirTipoCampo(el, dataEditable);

    let textoActual = '';
    if (tipoCampo === 'imagen') {
      textoActual = el.attr('src') ?? el.attr('alt') ?? '';
    } else if (tipoCampo === 'email') {
      const href = el.attr('href') ?? '';
      textoActual = href.startsWith('mailto:')
        ? href.replace('mailto:', '').trim()
        : el.text().trim();
    } else if (tipoCampo === 'telefono') {
      textoActual = el.text().trim();
    } else if (tipoCampo === 'enlace') {
      textoActual = el.text().trim();
    } else {
      textoActual = el.text().trim();
    }

    const atributos = extraerAtributos(el);
    const tagName =
      (element as unknown as { tagName?: string }).tagName?.toLowerCase() ??
      'div';

    seccionMap.get(seccion)!.push({
      id: elementId,
      tipoCampo,
      seccion,
      textoActual,
      etiquetaHtml: tagName,
      atributos,
    });
  });

  // ----------------------------------------------------------
  // PASO 2: Elementos con SOLO data-editable (patrón B)
  // Buscar el ancestro más cercano con data-section
  // ----------------------------------------------------------
  $('[data-editable]').not('[data-section]').each((index, element) => {
    const el = $(element);
    const dataEditable = el.attr('data-editable') ?? 'texto';

    // Buscar el ancestro más cercano con data-section
    const parentSection = el.closest('[data-section]');
    const seccion = parentSection.attr('data-section') ?? 'general';

    registrarSeccion(seccion);

    const elementId =
      el.attr('id') ?? `${seccion}-${dataEditable}-child-${index}`;
    const tipoCampo = inferirTipoCampo(el, dataEditable);

    let textoActual = '';
    if (tipoCampo === 'imagen') {
      textoActual = el.attr('src') ?? el.attr('alt') ?? '';
    } else if (tipoCampo === 'email') {
      const href = el.attr('href') ?? '';
      textoActual = href.startsWith('mailto:')
        ? href.replace('mailto:', '').trim()
        : el.text().trim();
    } else if (tipoCampo === 'telefono') {
      textoActual = el.text().trim();
    } else if (tipoCampo === 'enlace') {
      textoActual = el.text().trim();
    } else {
      textoActual = el.text().trim();
    }

    const atributos = extraerAtributos(el);
    const tagName =
      (element as unknown as { tagName?: string }).tagName?.toLowerCase() ??
      'div';

    seccionMap.get(seccion)!.push({
      id: elementId,
      tipoCampo,
      seccion,
      textoActual,
      etiquetaHtml: tagName,
      atributos,
    });
  });

  // ----------------------------------------------------------
  // PASO 3: Secciones vacías (solo data-section, sin hijos editables)
  // Registrarlas de todos modos para que aparezcan en el inventario
  // ----------------------------------------------------------
  $('[data-section]').each((_index, element) => {
    const seccion = $(element).attr('data-section') ?? 'general';
    registrarSeccion(seccion);
  });

  // ----------------------------------------------------------
  // Construir resultado
  // ----------------------------------------------------------
  const secciones: SeccionParseada[] = [];
  let totalCampos = 0;

  for (const [seccion, campos] of seccionMap) {
    secciones.push({
      seccion,
      orden: ordenSeccion.get(seccion) ?? 0,
      campos,
    });
    totalCampos += campos.length;
  }

  // Ordenar secciones por su aparición en el HTML
  secciones.sort((a, b) => a.orden - b.orden);

  return { secciones, totalCampos };
}
