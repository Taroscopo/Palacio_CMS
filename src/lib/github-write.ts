// ============================================================
// PALACIO CMS — Escritura a GitHub (Lightweight)
// ============================================================
// Módulo ligero para commits a GitHub usando únicamente fetch.
// NO importa Octokit ni @octokit/auth-app para evitar
// presión de memoria en Turbopack / runtime.
//
// Si GITHUB_TOKEN está configurado → commit real via REST API
// Si no → simulación local con console.warn
// ============================================================

const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? '';

/** Indica si hay un Personal Access Token configurado */
export const hasGitHubToken: boolean =
  GITHUB_TOKEN !== '' &&
  GITHUB_TOKEN !== 'tu_github_token_aqui';

/** Resultado de un commit */
export interface CommitResult {
  success: boolean;
  sha?: string;
  error?: string;
  simulation?: boolean;
}

/**
 * Obtiene el SHA actual de un archivo en el repositorio.
 */
async function getFileSha(
  repoOwner: string,
  repoName: string,
  filePath: string,
  branch: string
): Promise<string | null> {
  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Palacio-CMS/1.0',
    };
    if (hasGitHubToken) {
      headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
    }

    const res = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}?ref=${branch}`,
      { 
        headers,
        cache: 'no-store'
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    return data.sha ?? null;
  } catch {
    return null;
  }
}

/**
 * Descarga index.html desde raw.githubusercontent.com (sin API).
 * Versión lightweight sin Octokit para el módulo de escritura.
 */
export async function downloadHtmlLight(
  repoOwner: string,
  repoName: string,
  preferredBranch?: string
): Promise<{ success: true; html: string; branch: string } | { success: false; error: string }> {
  const branches = preferredBranch
    ? [preferredBranch, 'main', 'master']
    : ['main', 'master'];

  for (const branch of branches) {
    const rawUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${branch}/index.html?t=${Date.now()}`;
    try {
      const res = await fetch(rawUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'Palacio-CMS/1.0' },
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      });

      if (res.ok) {
        const html = await res.text();
        return { success: true, html, branch };
      }
      if (res.status === 404) continue;
    } catch {
      continue;
    }
  }

  return {
    success: false,
    error: `No se pudo descargar index.html desde ${repoOwner}/${repoName}`,
  };
}

/**
 * Realiza un commit de un archivo al repositorio de GitHub.
 *
 * Si GITHUB_TOKEN está configurado → commit real via REST API
 * Si no → simulación con console.warn
 */
export async function commitFileToGitHub(params: {
  repoOwner: string;
  repoName: string;
  branch: string;
  filePath: string;
  content: string;
  message: string;
  /** Si true, el contenido ya está en Base64 (ej: imágenes subidas) */
  isBase64?: boolean;
}): Promise<CommitResult> {
  // Sin token → simulación
  if (!hasGitHubToken) {
    console.warn(
      '[GitHub Write] GITHUB_TOKEN no configurado. Commit en modo simulación.'
    );
    return { success: true, simulation: true };
  }

  try {
    // 1. Obtener SHA actual del archivo
    const sha = await getFileSha(
      params.repoOwner,
      params.repoName,
      params.filePath,
      params.branch
    );

    // 2. Preparar el contenido en Base64
    const base64Content = params.isBase64
      ? params.content
      : Buffer.from(params.content, 'utf-8').toString('base64');

    // 3. Commit del archivo (crear o actualizar)
    const bodyPayload: Record<string, string> = {
      message: params.message,
      content: base64Content,
      branch: params.branch,
    };
    if (sha) {
      // Archivo existente: se necesita el SHA para actualizar
      bodyPayload.sha = sha;
    }

    const res = await fetch(
      `https://api.github.com/repos/${params.repoOwner}/${params.repoName}/contents/${params.filePath}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Palacio-CMS/1.0',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
      }
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const errorMsg =
        (errorData as { message?: string }).message || `HTTP ${res.status}`;
      console.error(`[GitHub Write] Error en commit: ${errorMsg}`);
      return { success: false, error: `Error al hacer commit: ${errorMsg}` };
    }

    const commitData = await res.json();
    console.log(
      `[GitHub Write] Commit exitoso: ${params.filePath} → ${commitData.commit?.sha?.slice(0, 7) ?? 'sin-sha'}`
    );

    return { success: true, sha: commitData.commit?.sha };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('[GitHub Write] Error:', message);
    return { success: false, error: message };
  }
}
