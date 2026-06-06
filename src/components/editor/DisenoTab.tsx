'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { BannerForm } from './BannerForm';
import type { DisenoTabProps, BannerPromocional } from './types';

// ============================================================
// Componente: ColorPicker — Selector de color con presets
// ============================================================

function ColorPicker({
  color,
  onChange,
}: {
  color: string;
  onChange: (color: string) => void;
}) {
  const presets = [
    '#111111', '#1e293b', '#334155', '#475569',
    '#0e7490', '#0284c7', '#0369a1', '#1d4ed8',
    '#15803d', '#166534', '#b91c1c', '#c2410c',
    '#a16207', '#7c3aed', '#be185d', '#9f1239',
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl border border-[#e5e5ea] shadow-sm"
          style={{ backgroundColor: color }}
        />
        <Input
          type="text"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="input-apple flex-1 font-mono text-sm"
        />
        <input
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
        />
      </div>
      <div className="grid grid-cols-8 gap-2">
        {presets.map((preset) => (
          <button
            key={preset}
            onClick={() => onChange(preset)}
            className={cn(
              'w-8 h-8 rounded-lg border-2 transition-all duration-200 hover:scale-110',
              color === preset ? 'border-[#111111] shadow-md' : 'border-transparent'
            )}
            style={{ backgroundColor: preset }}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Componente: DisenoTab — Panel de diseño (color + banner)
// ============================================================

export function DisenoTab({
  colorPrimario,
  setColorPrimario,
  banner,
  setBanner,
}: DisenoTabProps) {
  const bannerAlignClass =
    banner.alineacion === 'centro'
      ? 'text-center'
      : banner.alineacion === 'derecha'
        ? 'text-right'
        : 'text-left';

  const bannerWeightClass =
    banner.pesoTipografico === 'negrita'
      ? 'font-semibold'
      : banner.pesoTipografico === 'super-negrita'
        ? 'font-bold'
        : 'font-normal';

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Color Principal */}
      <div>
        <h4 className="text-sm font-medium text-[#111111] mb-1">Color Principal</h4>
        <p className="text-xs text-[#86868b] mb-3">
          Este color se aplicará a los botones y acentos de la landing page en tiempo real.
        </p>
        <ColorPicker color={colorPrimario} onChange={setColorPrimario} />
      </div>

      <div className="divider" />

      {/* Vista Previa del Color */}
      <div>
        <h4 className="text-sm font-medium text-[#111111] mb-2">Vista Previa del Color</h4>
        <div className="bg-[#f5f5f7] rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <button
              className="px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ backgroundColor: colorPrimario }}
            >
              Botón Primario
            </button>
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium border-2"
              style={{ borderColor: colorPrimario, color: colorPrimario }}
            >
              Botón Outline
            </button>
          </div>
          <div className="h-1.5 rounded-full w-full bg-[#e5e5ea] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ backgroundColor: colorPrimario, width: '60%' }}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colorPrimario }} />
            <span className="text-xs text-[#86868b]">Elementos de acento</span>
          </div>
        </div>
      </div>

      <div className="divider" />

      {/* Banner Promocional */}
      <BannerForm
        banner={banner}
        setBanner={setBanner}
        bannerAlignClass={bannerAlignClass}
        bannerWeightClass={bannerWeightClass}
      />
    </div>
  );
}
