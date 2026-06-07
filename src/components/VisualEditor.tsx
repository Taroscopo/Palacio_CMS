'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Lock,
  Save,
  Shield,
  LogOut,
  Type,
  LayoutGrid,
  Palette,
  AlertTriangle,
  Loader2,
  Image as ImageIcon,
  Sparkles,
  ArrowRight,
  Zap,
  Crown,
  Check,
  Github,
  Activity,
  X,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SeccionParseada } from '@/lib/html-parser';
import {
  MAX_CHANGES_FREE,
  BANNER_INICIAL,
  escapeRegex,
} from './editor/types';
import type { BannerPromocional } from './editor/types';
import { ContenidoTab } from './editor/ContenidoTab';
import { SidebarSecciones } from './editor/SidebarSecciones';
import { DisenoTab } from './editor/DisenoTab';

// ============================================================
// Tipos
// ============================================================

interface VisualEditorProps {
  email: string;
  nombre: string;
  estadoSuscripcion: 'gratis' | 'anual';
  cambiosEsteMes: number;
  sustratoNombre: string;
  sustratoId: string;
  onLogout: () => void;
}

// ============================================================
// Componentes auxiliares
// ============================================================

function LockedTabOverlay({ planLabel }: { planLabel: string }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/75 backdrop-blur-sm rounded-lg">
      <div className="bg-white rounded-2xl p-8 text-center max-w-xs shadow-lg border border-[#e5e5ea] animate-fade-in">
        <div className="w-14 h-14 rounded-xl bg-[#f5f5f7] flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7 text-[#86868b]" />
        </div>
        <h3 className="font-semibold text-lg text-[#111111] mb-2">Función Premium</h3>
        <p className="text-sm text-[#86868b] mb-4">
          Esta sección está disponible solo para el plan Anual. Actualiza tu suscripción para desbloquearla.
        </p>
        <Badge className="bg-[#f5f5f7] text-[#86868b] border-0 hover:bg-[#f5f5f7] text-xs">
          <Crown className="w-3 h-3 mr-1" />
          {planLabel}
        </Badge>
      </div>
    </div>
  );
}

function LimitModal({ open, onClose, cambios, max }: {
  open: boolean; onClose: () => void; cambios: number; max: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white border-[#e5e5ea] max-w-md">
        <DialogHeader>
          <div className="w-14 h-14 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-2">
            <AlertTriangle className="w-7 h-7 text-[#dc2626]" />
          </div>
          <DialogTitle className="text-[#111111] text-center">Límite Alcanzado</DialogTitle>
          <DialogDescription className="text-[#86868b] text-center">
            Has alcanzado el límite de <span className="font-semibold text-[#dc2626]">{cambios}/{max}</span> cambios mensuales del plan gratuito.
            Para realizar más ediciones, actualiza tu suscripción al plan Anual.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-[#f5f5f7] rounded-xl p-4 text-center space-y-3">
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{max}</div>
              <div className="text-[11px] text-[#86868b]">Cambios/mes</div>
              <Badge className="bg-amber-50 text-amber-700 border-0 hover:bg-amber-50 text-[10px] mt-1">Gratis</Badge>
            </div>
            <ArrowRight className="w-5 h-5 text-[#d1d1d6]" />
            <div className="text-center">
              <div className="text-2xl font-bold text-[#0e7490]">∞</div>
              <div className="text-[11px] text-[#86868b]">Cambios/mes</div>
              <Badge className="bg-cyan-50 text-[#0e7490] border-0 hover:bg-cyan-50 text-[10px] mt-1">Anual</Badge>
            </div>
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full btn-apple">
            <Sparkles className="w-4 h-4 mr-2" />
            Actualizar a Plan Anual
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full text-[#86868b]">
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Componente Principal: VisualEditor
// ============================================================

export function VisualEditor({
  email,
  nombre,
  estadoSuscripcion,
  cambiosEsteMes: cambiosIniciales,
  sustratoNombre,
  sustratoId,
  onLogout,
}: VisualEditorProps) {
  const [isLoading, setIsLoading] = useState(!!sustratoId);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [repoInfo, setRepoInfo] = useState('');
  const [rawHtml, setRawHtml] = useState('');
  const [seccionesApi, setSeccionesApi] = useState<SeccionParseada[]>([]);
  const [totalCampos, setTotalCampos] = useState(0);
  const [seccionVisibility, setSeccionVisibility] = useState<Record<string, boolean>>({});
  const [seccionOrder, setSeccionOrder] = useState<Record<string, number>>({});
  const [camposEditados, setCamposEditados] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<BannerPromocional>(BANNER_INICIAL);
  const [colorPrimario, setColorPrimario] = useState('#111111');
  const [cambiosEsteMes, setCambiosEsteMes] = useState(cambiosIniciales);
  const [activeTab, setActiveTab] = useState('contenido');
  const [isSaving, setIsSaving] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [selectedSeccion, setSelectedSeccion] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showSimulacionToast, setShowSimulacionToast] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'syncing' | 'success' | 'error'>('idle');

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const campoRefs = useRef<Record<string, HTMLElement>>({});

  const isPremium = estadoSuscripcion === 'anual';
  const puedeGuardar = isPremium || cambiosEsteMes < MAX_CHANGES_FREE;
  const cambiosRestantes = isPremium ? Infinity : MAX_CHANGES_FREE - cambiosEsteMes;

  // ============================================================
  // Cargar datos desde la API
  // ============================================================

  useEffect(() => {
    if (!sustratoId) { setIsLoading(false); return; }
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20_000);

    async function loadData() {
      try {
        const res = await fetch(`/api/editor/load?sustratoId=${encodeURIComponent(sustratoId)}`, { signal: controller.signal });
        if (!res.ok) throw new Error('Error al cargar datos');
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Error desconocido');
        if (cancelled) return;

        setRepoInfo(`${data.sustrato.repoOwner}/${data.sustrato.repoName}`);
        setRawHtml(data.html || '');
        const secciones: SeccionParseada[] = data.secciones || [];
        setSeccionesApi(secciones);
        setTotalCampos(data.totalCampos || 0);

        const vis: Record<string, boolean> = {};
        const ord: Record<string, number> = {};
        secciones.forEach((s: SeccionParseada) => { vis[s.seccion] = true; ord[s.seccion] = s.orden; });
        setSeccionVisibility(vis);
        setSeccionOrder(ord);
        if (secciones.length > 0) setSelectedSeccion(secciones[0].seccion);
        if (data.sustrato?.colorPrimario) setColorPrimario(data.sustrato.colorPrimario);
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof DOMException && err.name === 'AbortError'
          ? 'La carga tardó demasiado. Intenta de nuevo.'
          : err instanceof Error ? err.message : 'No se pudo cargar el contenido';
        console.error('[VisualEditor] Error cargando datos:', err);
        setLoadError(msg);
        setIsLoading(false);
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
    }
    loadData();
    return () => { cancelled = true; controller.abort(); clearTimeout(timeoutId); };
  }, [sustratoId]);

  // ============================================================
  // BIDIRECTIONAL FOCUS: Iframe → CMS
  // ============================================================

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type !== 'palacio-iframe-click') return;
      const clickedId = event.data.id as string;
      if (!clickedId) return;
      const foundSection = seccionesApi.find((s) => s.campos.some((c) => c.id === clickedId));
      if (!foundSection) return;
      setSelectedSeccion(foundSection.seccion);
      setActiveTab('contenido');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = campoRefs.current[clickedId];
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const focusable = el instanceof HTMLElement ? (el as HTMLInputElement) : null;
            if (focusable && typeof focusable.focus === 'function') focusable.focus();
          }
        });
      });
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [seccionesApi]);

  // ============================================================
  // Derivados
  // ============================================================

  const seccionesOrdenadas = useMemo(() => {
    return [...seccionesApi].sort((a, b) => {
      const ordA = seccionOrder[a.seccion] ?? a.orden;
      const ordB = seccionOrder[b.seccion] ?? b.orden;
      return ordA - ordB;
    });
  }, [seccionesApi, seccionOrder]);

  const previewHtml = useMemo(() => {
    if (!rawHtml) return '';
    let html = rawHtml;
    for (const [campoId, nuevoValor] of Object.entries(camposEditados)) {
      const campo = seccionesApi.flatMap((s) => s.campos).find((c) => c.id === campoId);
      if (!campo) continue;
      if (campo.tipoCampo === 'imagen') {
        const srcRegex = new RegExp(`(<[^>]*id=["']${escapeRegex(campoId)}["'][^>]*src=["'])[^"']*(["'])`, 'i');
        if (srcRegex.test(html)) html = html.replace(srcRegex, `$1${nuevoValor}$2`);
      } else {
        const tagRegex = new RegExp(`(<([a-zA-Z1-6]+)[^>]*id=["']${escapeRegex(campoId)}["'][^>]*>)([\\s\\S]*?)(<\\/\\2>)`, 'i');
        if (tagRegex.test(html)) html = html.replace(tagRegex, `$1${nuevoValor}$4`);
      }
    }
    return html;
  }, [rawHtml, camposEditados, seccionesApi]);

  // ============================================================
  // Handlers
  // ============================================================

  const sendToIframe = useCallback((message: { type: string; id: string }) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) {
      setTimeout(() => { iframeRef.current?.contentWindow?.postMessage(message, '*'); }, 150);
      return;
    }
    iframe.contentWindow.postMessage(message, '*');
  }, []);

  const handleCampoFocus = useCallback((campoId: string) => { sendToIframe({ type: 'palacio-focus', id: campoId }); }, [sendToIframe]);
  const handleCampoBlur = useCallback((campoId: string) => { sendToIframe({ type: 'palacio-blur', id: campoId }); }, [sendToIframe]);
  const handleCampoChange = useCallback((campoId: string, valor: string) => { setCamposEditados((prev) => ({ ...prev, [campoId]: valor })); }, []);

  const handleImageUpload = useCallback(async (campoId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { setUploadError('La imagen excede el límite de 4MB de Palacio CMS'); return; }
    setIsUploading(true);
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch('/api/editor/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campoId, sustratoId, fileName: file.name, base64: base64.split(',')[1] }),
        });
        const data = await res.json();

        // Manejar 403 — Plan agotado (desde el backend)
        if (res.status === 403) {
          setShowLimitModal(true);
          if (typeof data.cambiosEsteMes === 'number') {
            setCambiosEsteMes(data.cambiosEsteMes);
          }
          return;
        }

        if (!data.success) throw new Error(data.error || 'Error al subir imagen');
        handleCampoChange(campoId, data.relativePath);

        // Sincronizar contador con el valor real del servidor
        if (typeof data.cambiosEsteMes === 'number') {
          setCambiosEsteMes(data.cambiosEsteMes);
        }

        if (data.simulation) { setShowSimulacionToast(true); setTimeout(() => setShowSimulacionToast(false), 3000); }
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Error al subir imagen');
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  }, [sustratoId, handleCampoChange, setCambiosEsteMes, setShowLimitModal]);

  const handleReload = useCallback(async (forceBypassCache = false) => {
    if (!sustratoId) return;
    setSyncStatus('syncing');
    try {
      const url = `/api/editor/load?sustratoId=${encodeURIComponent(sustratoId)}${forceBypassCache ? '&nocache=1' : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Error al recargar');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Error al recargar');

      setRawHtml(data.html || '');
      setSeccionesApi(data.secciones || []);
      setTotalCampos(data.totalCampos || 0);
      setCamposEditados({}); // Limpiar cambios locales
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err) {
      console.error('[VisualEditor] Error al sincronizar:', err);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  }, [sustratoId]);

  const handleGuardar = useCallback(async () => {
    if (!puedeGuardar) { setShowLimitModal(true); return; }
    setIsSaving(true);
    setSyncStatus('saving');
    try {
      const res = await fetch('/api/editor/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sustratoId, camposEditados, banner, colorPrimario, seccionVisibility, seccionOrder }),
      });
      const data = await res.json();

      // Manejar 403 — Plan agotado (desde el backend)
      if (res.status === 403) {
        setShowLimitModal(true);
        setSyncStatus('idle');
        if (typeof data.cambiosEsteMes === 'number') {
          setCambiosEsteMes(data.cambiosEsteMes);
        }
        return;
      }

      // Manejar error del servidor
      if (!data.success) {
        console.error('[VisualEditor] Error al guardar:', data.error);
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 3000);
        return;
      }

      // Sincronizar contador con el valor real del servidor
      if (typeof data.cambiosEsteMes === 'number') {
        setCambiosEsteMes(data.cambiosEsteMes);
      }

      // Mostrar toast de simulación si aplica
      if (data.simulation) {
        setShowSimulacionToast(true);
        setTimeout(() => setShowSimulacionToast(false), 3000);
        setSaveSuccess(true);
        setSyncStatus('success');
        setTimeout(() => {
          setSaveSuccess(false);
          setSyncStatus('idle');
        }, 2000);
        return;
      }

      // Esperar 1.5 segundos para dar tiempo a GitHub a indexar el commit
      setSyncStatus('syncing');
      await new Promise((r) => setTimeout(r, 1500));

      // Cargar HTML actualizado desde GitHub anulando caché del servidor y busteando CDN
      const url = `/api/editor/load?sustratoId=${encodeURIComponent(sustratoId)}&nocache=1`;
      const resLoad = await fetch(url);
      if (!resLoad.ok) throw new Error('Error al recargar desde GitHub');
      const loadData = await resLoad.json();
      if (!loadData.success) throw new Error(loadData.error || 'Error al recargar');

      setRawHtml(loadData.html || '');
      setSeccionesApi(loadData.secciones || []);
      setTotalCampos(loadData.totalCampos || 0);
      setCamposEditados({}); // Limpiar cambios locales

      setSaveSuccess(true);
      setSyncStatus('success');
      setTimeout(() => {
        setSaveSuccess(false);
        setSyncStatus('idle');
      }, 3000);
    } catch (err) {
      console.error('[VisualEditor] Error de red al guardar:', err);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  }, [puedeGuardar, sustratoId, camposEditados, banner, colorPrimario, seccionVisibility, seccionOrder]);

  const handleToggleVisible = useCallback((seccionKey: string) => {
    setSeccionVisibility((prev) => ({ ...prev, [seccionKey]: !prev[seccionKey] }));
  }, []);

  const handleMoveSeccion = useCallback((seccionKey: string, direction: 'up' | 'down') => {
    setSeccionOrder((prevOrder) => {
      const sorted = [...seccionesApi].sort((a, b) => (prevOrder[a.seccion] ?? a.orden) - (prevOrder[b.seccion] ?? b.orden));
      const idx = sorted.findIndex((s) => s.seccion === seccionKey);
      if (idx === -1) return prevOrder;
      if (direction === 'up' && idx === 0) return prevOrder;
      if (direction === 'down' && idx === sorted.length - 1) return prevOrder;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      const newOrder = { ...prevOrder };
      const tempOrden = newOrder[sorted[idx].seccion] ?? sorted[idx].orden;
      newOrder[sorted[idx].seccion] = newOrder[sorted[swapIdx].seccion] ?? sorted[swapIdx].orden;
      newOrder[sorted[swapIdx].seccion] = tempOrden;
      return newOrder;
    });
  }, [seccionesApi]);

  // ============================================================
  // Loading state
  // ============================================================

  // Shared header for loading/error screens
  const miniHeader = (rightSlot?: React.ReactNode) => (
    <header className="sticky top-0 z-50 bg-white border-b border-[#e5e5ea]">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#0e7490] flex items-center justify-center"><Shield className="w-4 h-4 text-white" /></div>
          <div><h1 className="text-sm font-semibold text-[#111111] tracking-tight">Palacio CMS</h1><p className="text-[10px] text-[#86868b] -mt-0.5">{sustratoNombre}</p></div>
        </div>
        {rightSlot}
      </div>
    </header>
  );

  if (isLoading) {
    return (
      <div className="palacio-bg min-h-screen flex flex-col">
        {miniHeader()}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#86868b] animate-spin mx-auto" />
            <p className="text-sm text-[#86868b]">Cargando contenido desde GitHub...</p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // Error state
  // ============================================================

  if (loadError && seccionesApi.length === 0) {
    return (
      <div className="palacio-bg min-h-screen flex flex-col">
        {miniHeader(
          <Button variant="ghost" size="sm" onClick={onLogout} className="text-[#86868b] hover:text-[#111111] hover:bg-[#f5f5f7] h-8">
            <LogOut className="w-4 h-4" />
          </Button>
        )}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-sm px-4">
            <div className="w-14 h-14 rounded-xl bg-red-50 flex items-center justify-center mx-auto"><AlertTriangle className="w-7 h-7 text-[#dc2626]" /></div>
            <h3 className="font-semibold text-lg text-[#111111]">Error al Cargar</h3>
            <p className="text-sm text-[#86868b]">{loadError}</p>
            <Button onClick={() => window.location.reload()} className="btn-apple">Reintentar</Button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // Render Principal
  // ============================================================

  return (
    <div className="palacio-bg min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#e5e5ea]">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0e7490] flex items-center justify-center"><Shield className="w-4 h-4 text-white" /></div>
            <div>
              <h1 className="text-sm font-semibold text-[#111111] tracking-tight flex items-center gap-2">
                Palacio CMS
                {repoInfo && <Badge className="bg-[#f5f5f7] text-[#86868b] border-0 hover:bg-[#f5f5f7] text-[9px] font-mono tracking-normal px-1.5 py-0 h-4 select-none"><Github className="w-2.5 h-2.5 mr-0.5" />Repositorio: {repoInfo}</Badge>}
              </h1>
              <p className="text-[10px] text-[#86868b] -mt-0.5">{sustratoNombre}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {seccionesApi.length > 0 && <Badge className="bg-[#f5f5f7] text-[#86868b] border-0 hover:bg-[#f5f5f7] text-[9px] px-1.5 py-0 h-4 select-none hidden sm:inline-flex">{seccionesApi.length} seccion{seccionesApi.length !== 1 ? 'es' : ''} · {totalCampos} campo{totalCampos !== 1 ? 's' : ''}</Badge>}
            <div className="flex items-center gap-2 bg-[#f5f5f7] rounded-lg px-3 py-1.5">
              {isPremium ? (
                <><Zap className="w-3.5 h-3.5 text-[#0e7490]" /><span className="text-xs font-medium text-[#0e7490]">∞ Cambios</span></>
              ) : (<>
                  <Activity className="w-3.5 h-3.5 text-amber-600" />
                  <span className={cn('text-xs font-medium', cambiosRestantes <= 0 ? 'text-[#dc2626]' : 'text-amber-600')}>{cambiosEsteMes}/{MAX_CHANGES_FREE}</span>
                  <div className="w-12 h-1.5 rounded-full bg-[#e5e5ea] overflow-hidden"><div className={cn('h-full rounded-full transition-all duration-500', cambiosRestantes <= 0 ? 'bg-[#dc2626]' : cambiosRestantes === 1 ? 'bg-amber-500' : 'bg-[#111111]')} style={{ width: `${Math.min((cambiosEsteMes / MAX_CHANGES_FREE) * 100, 100)}%` }} /></div>
                </>)}
            </div>
            <Badge variant="outline" className={cn('text-[10px] border-0 font-medium', isPremium ? 'status-anual' : 'status-gratis')}>
              {isPremium ? <Crown className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}{isPremium ? 'Anual' : 'Gratis'}
            </Badge>

            {/* Botón de Sincronización Manual */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReload(true)}
              disabled={syncStatus === 'syncing' || syncStatus === 'saving'}
              className="border-[#0e7490] text-[#0e7490] hover:bg-cyan-50 h-8 flex items-center gap-1.5 px-2.5 transition-all duration-200 text-xs"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", (syncStatus === 'syncing' || syncStatus === 'saving') && "animate-spin")} />
              Sincronizar
            </Button>

            {/* Indicador de Estado de Sincronización */}
            {syncStatus !== 'idle' && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] font-medium h-8 px-2 flex items-center gap-1 border border-transparent transition-all duration-300 animate-fade-in select-none',
                  syncStatus === 'saving' || syncStatus === 'syncing' ? 'bg-cyan-50 text-[#0e7490] border-cyan-100' :
                  syncStatus === 'success' ? 'bg-green-50 text-green-700 border-green-100' :
                  'bg-red-50 text-red-700 border-red-100'
                )}
              >
                {syncStatus === 'saving' && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
                {syncStatus === 'syncing' && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
                {syncStatus === 'success' && <Check className="w-3 h-3 shrink-0" />}
                {syncStatus === 'error' && <AlertTriangle className="w-3 h-3 shrink-0" />}
                
                {syncStatus === 'saving' && 'Guardando...'}
                {syncStatus === 'syncing' && 'Sincronizando...'}
                {syncStatus === 'success' && '¡Guardado!'}
                {syncStatus === 'error' && 'Error de red'}
              </Badge>
            )}

            <div className="hidden sm:flex items-center gap-2 text-xs text-[#86868b]">
              <div className="w-6 h-6 rounded-full bg-[#f5f5f7] flex items-center justify-center text-[10px] font-bold text-[#111111]">{nombre.charAt(0)}</div>
              <span className="font-mono">{email}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onLogout} className="text-[#86868b] hover:text-[#111111] hover:bg-[#f5f5f7] h-8"><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      {/* Split Screen */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Panel Izquierdo — Editor */}
        <div className="w-full lg:w-1/2 palacio-panel overflow-y-auto custom-scrollbar p-4 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 bg-[#f5f5f7] rounded-lg h-10 p-0.5 mb-4">
              <TabsTrigger value="contenido" className="flex items-center gap-1.5 text-xs rounded-md data-[state=active]:bg-white data-[state=active]:text-[#111111] data-[state=active]:shadow-sm text-[#86868b]">
                <Type className="w-3.5 h-3.5" />Contenido
              </TabsTrigger>
              <TabsTrigger value="secciones" className="flex items-center gap-1.5 text-xs rounded-md data-[state=active]:bg-white data-[state=active]:text-[#111111] data-[state=active]:shadow-sm text-[#86868b] relative" disabled={!isPremium}>
                <LayoutGrid className="w-3.5 h-3.5" />Secciones{!isPremium && <Lock className="w-3 h-3 ml-1 text-amber-600" />}
              </TabsTrigger>
              <TabsTrigger value="diseno" className="flex items-center gap-1.5 text-xs rounded-md data-[state=active]:bg-white data-[state=active]:text-[#111111] data-[state=active]:shadow-sm text-[#86868b] relative" disabled={!isPremium}>
                <Palette className="w-3.5 h-3.5" />Diseño{!isPremium && <Lock className="w-3 h-3 ml-1 text-amber-600" />}
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 relative">
              <TabsContent value="contenido" className="mt-0">
                <ContenidoTab
                  isLoading={isLoading}
                  seccionesApi={seccionesApi}
                  selectedSeccion={selectedSeccion}
                  setSelectedSeccion={setSelectedSeccion}
                  camposEditados={camposEditados}
                  handleCampoChange={handleCampoChange}
                  handleCampoFocus={handleCampoFocus}
                  handleCampoBlur={handleCampoBlur}
                  campoRefs={campoRefs}
                  isUploading={isUploading}
                  uploadError={uploadError}
                  setUploadError={setUploadError}
                  handleImageUpload={handleImageUpload}
                />
              </TabsContent>
              <TabsContent value="secciones" className="mt-0">
                {!isPremium ? <LockedTabOverlay planLabel="Plan Gratuito" /> : (
                  <SidebarSecciones
                    seccionesOrdenadas={seccionesOrdenadas}
                    seccionVisibility={seccionVisibility}
                    onToggleVisible={handleToggleVisible}
                    onMoveSeccion={handleMoveSeccion}
                  />
                )}
              </TabsContent>
              <TabsContent value="diseno" className="mt-0">
                {!isPremium ? <LockedTabOverlay planLabel="Plan Gratuito" /> : (
                  <DisenoTab
                    colorPrimario={colorPrimario}
                    setColorPrimario={setColorPrimario}
                    banner={banner}
                    setBanner={setBanner}
                  />
                )}
              </TabsContent>
            </div>
          </Tabs>

          {/* Botón Guardar */}
          <div className="mt-4 pt-4 border-t border-[#e5e5ea]">
            <Button
              onClick={handleGuardar}
              disabled={isSaving || (!puedeGuardar && !isPremium)}
              className={cn('w-full h-11 font-medium rounded-lg transition-all duration-200', puedeGuardar ? 'btn-apple' : 'bg-[#f5f5f7] text-[#dc2626] hover:bg-red-50 cursor-not-allowed')}
            >
              {isSaving ? (<Loader2 className="w-5 h-5 animate-spin" />) : saveSuccess ? (<><Check className="w-4 h-4 mr-2" />¡Guardado!</>) : puedeGuardar ? (<><Save className="w-4 h-4 mr-2" />Guardar Cambios</>) : (<><Lock className="w-4 h-4 mr-2" />Límite Alcanzado ({cambiosEsteMes}/{MAX_CHANGES_FREE})</>)}
            </Button>
            {!isPremium && (
              <p className="text-center text-[10px] text-[#86868b] mt-2">
                {cambiosRestantes > 0 ? `${cambiosRestantes} cambio${cambiosRestantes === 1 ? '' : 's'} restante${cambiosRestantes === 1 ? '' : 's'} este mes` : 'Actualiza a plan Anual para cambios ilimitados'}
              </p>
            )}
          </div>
        </div>

        {/* Panel Derecho — Vista Previa */}
        <div className="w-full lg:w-1/2 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                <div className="w-3 h-3 rounded-full bg-[#28c840]" />
              </div>
              <span className="text-xs text-[#86868b] font-mono ml-2">preview.landing.page</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] border-[#e5e5ea] text-[#86868b]">En vivo</Badge>
              <div className="w-2 h-2 rounded-full bg-[#28c840] animate-pulse-dot" />
            </div>
          </div>
          <div className="flex-1 preview-frame overflow-hidden rounded-lg border border-[#e5e5ea] bg-white">
            {previewHtml ? (
              <iframe ref={iframeRef} srcDoc={previewHtml} className="w-full h-full border-0" title="Vista previa de la landing page" sandbox="allow-scripts allow-same-origin" />
            ) : !isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-3">
                  <ImageIcon className="w-10 h-10 text-[#d1d1d6] mx-auto" />
                  <p className="text-sm text-[#86868b]">No hay vista previa disponible</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Simulation Mode Toast */}
      {showSimulacionToast && (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
          <div className="bg-[#111111] text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 max-w-sm">
            <Shield className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-sm">Modo Simulación: Permisos de escritura de GitHub no configurados (GITHUB_TOKEN pendiente)</p>
            <button onClick={() => setShowSimulacionToast(false)} className="text-white/60 hover:text-white ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <LimitModal open={showLimitModal} onClose={() => setShowLimitModal(false)} cambios={cambiosEsteMes} max={MAX_CHANGES_FREE} />

      <footer className="bg-white border-t border-[#e5e5ea] py-2 text-center text-[10px] text-[#c7c7cc]">
        Palacio CMS v1.0 — Editor Visual
      </footer>
    </div>
  );
}
