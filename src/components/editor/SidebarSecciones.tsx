'use client';

import React from 'react';
import { Eye, EyeOff, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatSectionName } from './types';
import type { SidebarSeccionesProps } from './types';

// ============================================================
// Componente: SidebarSecciones — Barra lateral de navegación
// de las 15 secciones con visibilidad y reordenamiento
// ============================================================

export function SidebarSecciones({
  seccionesOrdenadas,
  seccionVisibility,
  onToggleVisible,
  onMoveSeccion,
}: SidebarSeccionesProps) {
  return (
    <div className="space-y-3 animate-fade-in">
      <p className="text-xs text-[#86868b]">
        Controla la visibilidad y el orden de las secciones en tu landing page.
      </p>
      <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar">
        {seccionesOrdenadas.map((seccion, idx) => {
          const visible = seccionVisibility[seccion.seccion] ?? true;

          return (
            <div
              key={seccion.seccion}
              className={cn(
                'bg-[#f5f5f7] rounded-lg p-3 flex items-center gap-3 transition-all duration-200',
                !visible && 'opacity-50'
              )}
            >
              <GripVertical className="w-4 h-4 text-[#d1d1d6] shrink-0 cursor-grab" />

              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#111111] truncate">
                  {formatSectionName(seccion.seccion)}
                </div>
                <div className="text-[10px] text-[#86868b] font-mono">
                  data-section=&quot;{seccion.seccion}&quot; · {seccion.campos.length} campo{seccion.campos.length !== 1 ? 's' : ''}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onToggleVisible(seccion.seccion)}
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                    visible
                      ? 'bg-[#0e7490]/10 text-[#0e7490] hover:bg-[#0e7490]/20'
                      : 'bg-white text-[#86868b] hover:bg-[#e5e5ea]'
                  )}
                  title={visible ? 'Ocultar sección' : 'Mostrar sección'}
                >
                  {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => onMoveSeccion(seccion.seccion, 'up')}
                  disabled={idx === 0}
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                    idx === 0
                      ? 'text-[#d1d1d6] cursor-not-allowed'
                      : 'text-[#86868b] hover:bg-[#e5e5ea] hover:text-[#111111]'
                  )}
                  title="Mover arriba"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onMoveSeccion(seccion.seccion, 'down')}
                  disabled={idx === seccionesOrdenadas.length - 1}
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                    idx === seccionesOrdenadas.length - 1
                      ? 'text-[#d1d1d6] cursor-not-allowed'
                      : 'text-[#86868b] hover:bg-[#e5e5ea] hover:text-[#111111]'
                  )}
                  title="Mover abajo"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
