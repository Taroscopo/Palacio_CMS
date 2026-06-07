'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LayoutGrid, Loader2, AlertTriangle, AlignLeft, History, RotateCcw } from 'lucide-react';
import { X, Type, Image as ImageIcon, Link, Mail, Phone, Code } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatSectionName, TIPO_CAMPO_LABEL } from './types';
import { ImageUploader } from './ImageUploader';
import type { ContenidoTabProps } from './types';

// ============================================================
// Componente: CampoIcon — icono según tipoCampo
// ============================================================

function CampoIcon({ tipoCampo }: { tipoCampo: string }) {
  switch (tipoCampo) {
    case 'titulo':
      return <Type className="w-3.5 h-3.5 text-[#86868b] shrink-0" />;
    case 'imagen':
      return <ImageIcon className="w-3.5 h-3.5 text-[#86868b] shrink-0" />;
    case 'enlace':
      return <Link className="w-3.5 h-3.5 text-[#86868b] shrink-0" />;
    case 'email':
      return <Mail className="w-3.5 h-3.5 text-[#86868b] shrink-0" />;
    case 'telefono':
      return <Phone className="w-3.5 h-3.5 text-[#86868b] shrink-0" />;
    case 'html':
      return <Code className="w-3.5 h-3.5 text-[#86868b] shrink-0" />;
    case 'texto':
    default:
      return <AlignLeft className="w-3.5 h-3.5 text-[#86868b] shrink-0" />;
  }
}

// ============================================================
// Componente: ContenidoTab — Panel de edición de contenido
// ============================================================

export function ContenidoTab({
  isLoading,
  seccionesApi,
  selectedSeccion,
  setSelectedSeccion,
  camposEditados,
  handleCampoChange,
  handleCampoFocus,
  handleCampoBlur,
  campoRefs,
  isUploading,
  uploadError,
  setUploadError,
  handleImageUpload,
  isPremium = false,
  historialCambios = [],
  valoresIniciales = {},
}: ContenidoTabProps) {
  const [openHistoryCampoId, setOpenHistoryCampoId] = React.useState<string | null>(null);

  const formatRelativeTime = (isoString: string) => {
    if (!isoString) return 'Versión Original';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHrs = Math.floor(diffMins / 60);
      
      if (diffMins < 1) return 'Hace unos instantes';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHrs < 24) return `Hace ${diffHrs} hora${diffHrs > 1 ? 's' : ''}`;
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Cambio guardado';
    }
  };

  const getHistorialFiltrado = (campoId: string, textoOriginal: string) => {
    const filtrado = (historialCambios || [])
      .filter((h) => h.campo_id === campoId && h.valor !== null && h.valor !== undefined)
      .filter((item, index, self) => self.findIndex(t => t.valor === item.valor) === index);
      
    const ultimos5 = filtrado.slice(0, 5);

    if (textoOriginal && !ultimos5.some(u => u.valor === textoOriginal)) {
      ultimos5.push({
        campo_id: campoId,
        valor: textoOriginal,
        creado_en: ''
      });
    }
    
    return ultimos5;
  };
  const seccionSeleccionada = seccionesApi.find((s) => s.seccion === selectedSeccion);

  // ---- Loading ----
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Loader2 className="w-8 h-8 text-[#86868b] animate-spin mb-3" />
        <p className="text-sm text-[#86868b]">Cargando campos editables...</p>
      </div>
    );
  }

  // ---- Sin secciones ----
  if (seccionesApi.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <LayoutGrid className="w-10 h-10 text-[#d1d1d6] mb-3" />
        <p className="text-[#86868b] text-sm">No se encontraron secciones editables</p>
      </div>
    );
  }

  // ---- Sin sección seleccionada ----
  if (!seccionSeleccionada) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <LayoutGrid className="w-10 h-10 text-[#d1d1d6] mb-3" />
        <p className="text-[#86868b] text-sm">Selecciona una sección para editar su contenido</p>
      </div>
    );
  }

  // ---- Contenido principal ----
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Selector de sección */}
      <div className="space-y-2">
        <Label className="text-[10px] text-[#86868b] uppercase tracking-wider font-medium">Sección Activa</Label>
        <div className="flex gap-2 flex-wrap max-h-32 overflow-y-auto custom-scrollbar">
          {seccionesApi.map((s) => (
            <button
              key={s.seccion}
              onClick={() => setSelectedSeccion(s.seccion)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 shrink-0',
                selectedSeccion === s.seccion
                  ? 'bg-[#111111] text-white'
                  : 'bg-[#f5f5f7] text-[#86868b] hover:text-[#111111]'
              )}
            >
              {formatSectionName(s.seccion)}
            </button>
          ))}
        </div>
      </div>

      <div className="divider" />

      {/* Campos de la sección seleccionada */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#0e7490]" />
          <span className="text-xs font-medium text-[#111111]">
            {formatSectionName(seccionSeleccionada.seccion)}
          </span>
          <Badge className="bg-[#f5f5f7] text-[#86868b] border-0 hover:bg-[#f5f5f7] text-[9px] px-1.5 py-0 h-4">
            {seccionSeleccionada.campos.length} campo{seccionSeleccionada.campos.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {seccionSeleccionada.campos.length === 0 ? (
          <div className="text-center py-6">
            <AlignLeft className="w-8 h-8 text-[#d1d1d6] mx-auto mb-2" />
            <p className="text-xs text-[#86868b]">Esta sección no tiene campos editables</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[calc(100vh-360px)] overflow-y-auto custom-scrollbar pr-1">
            {/* Alerta de error de subida */}
            {uploadError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#dc2626] shrink-0" />
                <p className="text-xs text-[#dc2626] flex-1">{uploadError}</p>
                <button onClick={() => setUploadError(null)} className="text-[#dc2626] hover:text-red-700">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Renderizar cada campo */}
            {seccionSeleccionada.campos.map((campo) => {
              const currentValue = camposEditados[campo.id] ?? campo.textoActual;
              const label = TIPO_CAMPO_LABEL[campo.tipoCampo] || 'Texto';

              return (
                <div key={campo.id} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <CampoIcon tipoCampo={campo.tipoCampo} />
                    <Label className="text-xs font-medium text-[#111111]">{label}</Label>
                    <Badge
                      className="bg-[#f5f5f7] text-[#86868b] border-0 hover:bg-[#f5f5f7] text-[9px] font-mono px-1.5 py-0 h-4"
                    >
                      &lt;{campo.etiquetaHtml}&gt;
                    </Badge>
                    {isPremium && (
                      <button
                        type="button"
                        onClick={() => setOpenHistoryCampoId(openHistoryCampoId === campo.id ? null : campo.id)}
                        className={cn(
                          "ml-auto p-1 rounded-md hover:bg-[#f5f5f7] transition-colors",
                          openHistoryCampoId === campo.id ? "text-[#0e7490] bg-[#f5f5f7]" : "text-[#86868b]"
                        )}
                        title="Ver historial de versiones"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {campo.tipoCampo === 'texto' || campo.tipoCampo === 'html' ? (
                    <Textarea
                      value={currentValue}
                      onChange={(e) => handleCampoChange(campo.id, e.target.value)}
                      onFocus={() => handleCampoFocus(campo.id)}
                      onBlur={() => handleCampoBlur(campo.id)}
                      ref={(el) => { if (el) campoRefs.current[campo.id] = el; }}
                      className="input-apple text-sm min-h-[80px] resize-y"
                      placeholder={campo.textoActual || label}
                    />
                  ) : campo.tipoCampo === 'imagen' ? (
                    <ImageUploader
                      campoId={campo.id}
                      currentValue={currentValue}
                      isUploading={isUploading}
                      onUpload={handleImageUpload}
                      onFocus={() => handleCampoFocus(campo.id)}
                      onBlur={() => handleCampoBlur(campo.id)}
                      campoRef={(el) => { if (el) campoRefs.current[campo.id] = el; }}
                    />
                  ) : (
                    <Input
                      value={currentValue}
                      onChange={(e) => handleCampoChange(campo.id, e.target.value)}
                      onFocus={() => handleCampoFocus(campo.id)}
                      onBlur={() => handleCampoBlur(campo.id)}
                      ref={(el) => { if (el) campoRefs.current[campo.id] = el; }}
                      className={cn(
                        'input-apple text-sm',
                        campo.tipoCampo === 'enlace' || campo.tipoCampo === 'email' ? 'font-mono' : ''
                      )}
                      placeholder={campo.textoActual || label}
                    />
                  )}

                  {isPremium && openHistoryCampoId === campo.id && (
                    <div className="bg-[#f5f5f7] border border-[#e5e5ea] rounded-xl p-3 space-y-2 mt-2 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-[#111111] uppercase tracking-wider">Historial de Cambios</span>
                        <button 
                          type="button"
                          onClick={() => setOpenHistoryCampoId(null)} 
                          className="text-[#86868b] hover:text-[#111111]"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                        {getHistorialFiltrado(campo.id, valoresIniciales?.[campo.id] || campo.textoActual).map((hist, idx) => {
                          const isCurrent = currentValue === hist.valor;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                handleCampoChange(campo.id, hist.valor);
                              }}
                              className={cn(
                                "w-full text-left p-2 rounded-lg flex items-start gap-2.5 transition-all text-xs border border-transparent",
                                isCurrent 
                                  ? "bg-white border-[#e5e5ea] shadow-sm font-medium text-[#0e7490]" 
                                  : "hover:bg-white hover:border-[#e5e5ea] text-[#111111]"
                              )}
                            >
                              <RotateCcw className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#86868b]" />
                              <div className="flex-1 min-w-0">
                                <p className="truncate font-mono text-[11px] bg-[#f5f5f7] px-1.5 py-0.5 rounded border border-[#e5e5ea] inline-block max-w-full">
                                  {hist.valor || '(vacío)'}
                                </p>
                                <p className="text-[10px] text-[#86868b] mt-1">
                                  {formatRelativeTime(hist.creado_en)}
                                </p>
                              </div>
                              {isCurrent && (
                                <span className="text-[10px] bg-cyan-50 text-[#0e7490] px-1.5 py-0.5 rounded font-semibold self-center">
                                  Actual
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
