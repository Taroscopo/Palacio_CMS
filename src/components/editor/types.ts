// ============================================================
// PALACIO CMS — Tipos y constantes compartidos del editor
// ============================================================

import type { SeccionParseada } from '@/lib/html-parser';

// ============================================================
// Banner Promocional
// ============================================================

export interface BannerPromocional {
  activo: boolean;
  texto: string;
  colorFondo: string;
  textoBoton: string;
  enlaceBoton: string;
  posicion: number;
  alineacion: 'izquierda' | 'centro' | 'derecha';
  pesoTipografico: 'normal' | 'negrita' | 'super-negrita';
}

export const BANNER_INICIAL: BannerPromocional = {
  activo: false,
  texto: '',
  colorFondo: '#111111',
  textoBoton: '',
  enlaceBoton: '',
  posicion: 1,
  alineacion: 'izquierda',
  pesoTipografico: 'normal',
};

// ============================================================
// Constantes
// ============================================================

export const MAX_CHANGES_FREE = 3;

export const TIPO_CAMPO_LABEL: Record<string, string> = {
  titulo: 'Título',
  texto: 'Texto',
  imagen: 'Imagen',
  enlace: 'Enlace',
  email: 'Email',
  telefono: 'Teléfono',
  html: 'HTML',
};

// ============================================================
// Utilidades
// ============================================================

export function formatSectionName(key: string): string {
  return key
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================
// Props de subcomponentes
// ============================================================

export interface BannerFormProps {
  banner: BannerPromocional;
  setBanner: React.Dispatch<React.SetStateAction<BannerPromocional>>;
  bannerAlignClass: string;
  bannerWeightClass: string;
}

export interface ImageUploaderProps {
  campoId: string;
  currentValue: string;
  isUploading: boolean;
  onUpload: (campoId: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  onBlur: () => void;
  campoRef: (el: HTMLElement | null) => void;
}

export interface SidebarSeccionesProps {
  seccionesOrdenadas: SeccionParseada[];
  seccionVisibility: Record<string, boolean>;
  onToggleVisible: (seccionKey: string) => void;
  onMoveSeccion: (seccionKey: string, direction: 'up' | 'down') => void;
}

export interface ContenidoTabProps {
  isLoading: boolean;
  seccionesApi: SeccionParseada[];
  selectedSeccion: string;
  setSelectedSeccion: (seccion: string) => void;
  camposEditados: Record<string, string>;
  handleCampoChange: (campoId: string, valor: string) => void;
  handleCampoFocus: (campoId: string) => void;
  handleCampoBlur: (campoId: string) => void;
  campoRefs: React.MutableRefObject<Record<string, HTMLElement>>;
  isUploading: boolean;
  uploadError: string | null;
  setUploadError: (error: string | null) => void;
  handleImageUpload: (campoId: string, e: React.ChangeEvent<HTMLInputElement>) => void;
}

export interface DisenoTabProps {
  colorPrimario: string;
  setColorPrimario: (color: string) => void;
  banner: BannerPromocional;
  setBanner: React.Dispatch<React.SetStateAction<BannerPromocional>>;
}
