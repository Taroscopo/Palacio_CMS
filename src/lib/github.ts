// ============================================================
// PALACIO CMS — Conector de GitHub
// ============================================================
// Estrategia de descarga (en orden de prioridad):
//
//   1. GitHub App autenticada (installation_id disponible)
//      → Usa Octokit con token de instalación para repos privados
//
//   2. raw.githubusercontent.com (fetch HTTP directo)
//      → Descarga el archivo crudo desde GitHub sin usar la API
//      → Sin rate-limit, sin autenticación, respuesta instantánea
//      → Solo funciona para repositorios públicos
//
//   3. Si ambas fallan → retorna error (NUNCA inventa HTML falso)
// ============================================================

import { Octokit } from 'octokit';
import { createAppAuth } from '@octokit/auth-app';

// ============================================================
// Variables de entorno
// ============================================================

const GITHUB_APP_ID = process.env.GITHUB_APP_ID ?? '';
const GITHUB_APP_PRIVATE_KEY = process.env.GITHUB_APP_PRIVATE_KEY ?? '';

/**
 * Indica si las credenciales de GitHub App están correctamente
 * configuradas en las variables de entorno.
 */
export const isGitHubConfigured =
  GITHUB_APP_ID !== '' &&
  GITHUB_APP_ID !== 'tu_github_app_id_aqui' &&
  GITHUB_APP_PRIVATE_KEY !== '' &&
  GITHUB_APP_PRIVATE_KEY !== 'tu_github_app_private_key_aqui';

// ============================================================
// Singleton: Octokit a nivel de aplicación (sin instalación)
// ============================================================

let appOctokitInstance: Octokit | null = null;

function getAppOctokit(): Octokit | null {
  if (!isGitHubConfigured) return null;
  if (appOctokitInstance) return appOctokitInstance;

  try {
    appOctokitInstance = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: Number(GITHUB_APP_ID),
        privateKey: GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
    });
    return appOctokitInstance;
  } catch (error) {
    console.error('[GitHub] Error al crear Octokit de App:', error);
    return null;
  }
}

// ============================================================
// Obtener Octokit con token de instalación
// ============================================================

/**
 * Crea un Octokit autenticado con el token de instalación de la
 * GitHub App para un installation_id específico. Esto permite
 * realizar operaciones en nombre de la instalación del repositorio.
 */
export async function getInstallationOctokit(
  installationId: number
): Promise<Octokit | null> {
  if (!isGitHubConfigured || !installationId) return null;

  try {
    const octokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: Number(GITHUB_APP_ID),
        privateKey: GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n'),
        installationId,
      },
    });
    return octokit;
  } catch (error) {
    console.error('[GitHub] Error al crear Octokit de instalación:', error);
    return null;
  }
}

// ============================================================
// Tipos de resultado
// ============================================================

export interface DownloadSuccess {
  success: true;
  html: string;
  repoOwner: string;
  repoName: string;
  branch: string;
  sha: string;
}

export interface DownloadError {
  success: false;
  error: string;
}

export type DownloadResult = DownloadSuccess | DownloadError;

// ============================================================
// Función principal: descargar index.html
// ============================================================

/**
 * Descarga el archivo `index.html` desde la rama principal
 * de un repositorio de GitHub.
 *
 * Estrategia (en orden):
 *   1. GitHub App autenticada (si hay installation_id)
 *   2. raw.githubusercontent.com (fetch HTTP directo, sin API)
 *   3. Error real si ambas fallan — NUNCA inventa HTML falso
 */
export async function downloadIndexHtml(
  repoOwner: string,
  repoName: string,
  installationId?: number,
  preferredBranch?: string
): Promise<DownloadResult> {
  // ----------------------------------------------------------
  // RUTA 1: GitHub App configurada + installation_id disponible
  // ----------------------------------------------------------
  if (isGitHubConfigured && installationId) {
    const octokit = await getInstallationOctokit(installationId);

    if (!octokit) {
      return {
        success: false,
        error: 'No se pudo autenticar la instalación de GitHub App. Verifica el installation_id.',
      };
    }

    try {
      // 1. Obtener la rama por defecto del repositorio
      const { data: repoData } = await octokit.rest.repos.get({
        owner: repoOwner,
        repo: repoName,
      });

      const defaultBranch = repoData.default_branch;

      // 2. Descargar index.html desde la rama por defecto
      const { data: fileData } = await octokit.rest.repos.getContent({
        owner: repoOwner,
        repo: repoName,
        path: 'index.html',
        ref: defaultBranch,
      });

      // GitHub API devuelve archivos como objetos con content + encoding
      if (!('content' in fileData) || !('encoding' in fileData)) {
        return {
          success: false,
          error: `index.html en ${repoOwner}/${repoName} no es un archivo regular (posiblemente un directorio).`,
        };
      }

      // Decodificar de base64 a texto plano
      const rawContent = (fileData.content as string).replace(/\n/g, '');
      const html = Buffer.from(rawContent, 'base64').toString('utf-8');

      return {
        success: true,
        html,
        repoOwner,
        repoName,
        branch: defaultBranch,
        sha: fileData.sha,
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';

      console.error('[GitHub] Error con GitHub App:', message);

      // Si la App autenticada falla, NO caer a raw — es un error real
      if (message.includes('404')) {
        return {
          success: false,
          error: `No se encontró index.html en ${repoOwner}/${repoName}. Verifica que el archivo exista en la rama principal.`,
        };
      }

      if (message.includes('401') || message.includes('403')) {
        return {
          success: false,
          error: `Sin permisos para acceder a ${repoOwner}/${repoName}. Verifica que la GitHub App tenga acceso al repositorio.`,
        };
      }

      return {
        success: false,
        error: `Error al descargar index.html: ${message}`,
      };
    }
  }

  // ----------------------------------------------------------
  // RUTA 2: raw.githubusercontent.com (fetch HTTP directo)
  // ----------------------------------------------------------
  // Consulta directa al servidor de archivos crudos de GitHub.
  // No usa la API de desarrolladores, así que no hay rate-limit
  // por IP. Entrega el archivo real instantáneamente.
  // Solo funciona para repositorios públicos.
  // ----------------------------------------------------------
  try {
    // Si se proporciona una rama preferida, intentarla primero
    const branches = preferredBranch
      ? [preferredBranch, 'main', 'master']
      : ['main', 'master'];

    for (const branch of branches) {
      const rawUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${branch}/index.html`;
      console.log(`[GitHub] Fetch directo: ${rawUrl}`);

      const res = await fetch(rawUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Palacio-CMS/1.0',
        },
        signal: AbortSignal.timeout(15_000), // 15 segundos de timeout
      });

      if (res.ok) {
        const html = await res.text();
        const contentLength = html.length;
        console.log(
          `[GitHub] Descarga exitosa: ${contentLength} chars desde ${rawUrl}`
        );

        return {
          success: true,
          html,
          repoOwner,
          repoName,
          branch,
          sha: `raw-${branch}-${Date.now()}`,
        };
      }

      // 404 = archivo no encontrado en esta rama, probar la siguiente
      if (res.status === 404) {
        console.log(`[GitHub] No encontrado en rama ${branch}, probando siguiente...`);
        continue;
      }

      // 403 u otro error = problema real
      if (res.status === 403) {
        return {
          success: false,
          error: `Acceso denegado a ${repoOwner}/${repoName}. El repositorio puede ser privado.`,
        };
      }

      return {
        success: false,
        error: `Error HTTP ${res.status} al descargar index.html desde ${rawUrl}.`,
      };
    }

    // Si probó todas las ramas y no encontró el archivo
    return {
      success: false,
      error: `No se encontró index.html en ${repoOwner}/${repoName}. Se intentó en las ramas: ${branches.join(', ')}. Verifica que el repositorio exista y sea público.`,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Error desconocido';

    console.error('[GitHub] Error en fetch directo a raw.githubusercontent.com:', message);

    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return {
        success: false,
        error: `Timeout al conectar con GitHub para ${repoOwner}/${repoName}. Verifica tu conexión a internet.`,
      };
    }

    return {
      success: false,
      error: `Error de conexión al descargar index.html: ${message}`,
    };
  }
}

// ============================================================
// Obtener las instalaciones disponibles de la GitHub App
// ============================================================

/**
 * Lista todas las instalaciones donde la GitHub App está instalada.
 * Útil para el panel de administración al vincular nuevos repositorios.
 */
export async function listInstallations(): Promise<
  Array<{ id: number; account: string; repository_selection: string }>
> {
  const octokit = getAppOctokit();
  if (!octokit) return [];

  try {
    const { data } = await octokit.rest.apps.listInstallations();
    return data.map((inst) => ({
      id: inst.id,
      account:
        (inst.account as { login?: string })?.login ?? `installation-${inst.id}`,
      repository_selection: inst.repository_selection,
    }));
  } catch (error) {
    console.error('[GitHub] Error listando instalaciones:', error);
    return [];
  }
}

// ============================================================
// Commit directo vía GitHub REST API (Personal Access Token)
// ============================================================
// Alternativa más simple que la GitHub App para commits directos.
// Requiere la variable de entorno GITHUB_TOKEN con un PAT que
// tenga permisos de 'repo' (contents:write).
// ============================================================

const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? '';

/**
 * Indica si hay un Personal Access Token de GitHub configurado
 * para realizar commits directos al repositorio.
 */
export const hasGitHubToken: boolean =
  GITHUB_TOKEN !== '' &&
  GITHUB_TOKEN !== 'tu_github_token_aqui';

/**
 * Indica si hay alguna forma de escribir a GitHub configurada
 * (GitHub App o Personal Access Token).
 */
export const isGitHubWriteConfigured: boolean =
  isGitHubConfigured || hasGitHubToken;

/** Resultado de un commit a GitHub */
export interface CommitResult {
  success: boolean;
  sha?: string;
  error?: string;
  simulation?: boolean;
}

/**
 * Obtiene el SHA actual de un archivo en el repositorio.
 * Necesario para poder actualizarlo con la GitHub Contents API.
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
      { headers }
    );

    if (!res.ok) {
      console.error(
        `[GitHub] Error obteniendo SHA de ${filePath}: HTTP ${res.status}`
      );
      return null;
    }

    const data = await res.json();
    return data.sha ?? null;
  } catch (error) {
    console.error('[GitHub] Error obteniendo SHA:', error);
    return null;
  }
}

/**
 * Realiza un commit de un archivo al repositorio de GitHub
 * usando la Contents API (PUT).
 *
 * Estrategia:
 *   1. Si GITHUB_TOKEN está configurado → commit directo via REST API
 *   2. Si GitHub App está configurada + installation_id → usar Octokit
 *   3. Si ninguna → simulación local con console.warn
 */
export async function commitFileToGitHub(params: {
  repoOwner: string;
  repoName: string;
  branch: string;
  filePath: string;
  content: string;
  message: string;
  installationId?: number;
}): Promise<CommitResult> {
  // ----------------------------------------------------------
  // RUTA 1: Personal Access Token (GITHUB_TOKEN)
  // ----------------------------------------------------------
  if (hasGitHubToken) {
    try {
      // 1. Obtener SHA actual del archivo
      const sha = await getFileSha(
        params.repoOwner,
        params.repoName,
        params.filePath,
        params.branch
      );

      if (!sha) {
        return {
          success: false,
          error: `No se pudo obtener el SHA de ${params.filePath} en ${params.repoOwner}/${params.repoName}`,
        };
      }

      // 2. Commit del archivo actualizado
      const body: Record<string, unknown> = {
        message: params.message,
        content: Buffer.from(params.content, 'utf-8').toString('base64'),
        sha,
        branch: params.branch,
      };

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
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg =
          (errorData as { message?: string }).message ||
          `HTTP ${res.status}`;
        console.error(
          `[GitHub] Error en commit: ${errorMsg}`
        );
        return {
          success: false,
          error: `Error al hacer commit: ${errorMsg}`,
        };
      }

      const commitData = await res.json();
      console.log(
        `[GitHub] Commit exitoso: ${params.filePath} → ${commitData.commit?.sha?.slice(0, 7) ?? 'sin-sha'}`
      );

      return {
        success: true,
        sha: commitData.commit?.sha,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      console.error('[GitHub] Error en commit con GITHUB_TOKEN:', message);
      return { success: false, error: message };
    }
  }

  // ----------------------------------------------------------
  // RUTA 2: GitHub App con installation_id
  // ----------------------------------------------------------
  if (isGitHubConfigured && params.installationId) {
    try {
      const octokit = await getInstallationOctokit(params.installationId);
      if (!octokit) {
        return {
          success: false,
          error: 'No se pudo autenticar la instalación de GitHub App',
        };
      }

      // Obtener SHA actual
      const { data: fileData } = await octokit.rest.repos.getContent({
        owner: params.repoOwner,
        repo: params.repoName,
        path: params.filePath,
        ref: params.branch,
      });

      if (!('sha' in fileData)) {
        return {
          success: false,
          error: `${params.filePath} no es un archivo regular`,
        };
      }

      // Commit
      await octokit.rest.repos.createOrUpdateFileContents({
        owner: params.repoOwner,
        repo: params.repoName,
        path: params.filePath,
        message: params.message,
        content: Buffer.from(params.content, 'utf-8').toString('base64'),
        sha: fileData.sha,
        branch: params.branch,
      });

      console.log(
        `[GitHub] Commit exitoso via GitHub App: ${params.filePath}`
      );

      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      console.error('[GitHub] Error en commit con GitHub App:', message);
      return { success: false, error: message };
    }
  }

  // ----------------------------------------------------------
  // RUTA 3: Sin credenciales → Simulación
  // ----------------------------------------------------------
  console.warn(
    '[GitHub] GITHUB_TOKEN y GitHub App no configurados. ' +
    'Commit operará en modo simulación.'
  );

  return {
    success: true,
    simulation: true,
  };
}
