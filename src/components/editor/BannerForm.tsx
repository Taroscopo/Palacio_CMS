'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BannerFormProps, BannerPromocional } from './types';

// ============================================================
// Componente: BannerForm — Configuración del banner promocional
// ============================================================

export function BannerForm({ banner, setBanner, bannerAlignClass, bannerWeightClass }: BannerFormProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Megaphone className="w-4 h-4 text-[#111111]" />
        <h4 className="text-sm font-medium text-[#111111]">Banner Promocional</h4>
      </div>
      <p className="text-xs text-[#86868b] mb-4">
        Agrega un banner de anuncios entre las secciones de tu web. Configura el texto, color y enlace.
      </p>

      <div className="space-y-3">
        <div className="flex items-center justify-between bg-[#f5f5f7] rounded-lg p-3">
          <Label className="text-sm text-[#111111]">Activar Banner</Label>
          <Switch
            checked={banner.activo}
            onCheckedChange={(checked) => setBanner((prev) => ({ ...prev, activo: checked }))}
          />
        </div>

        {banner.activo && (
          <div className="space-y-3 animate-fade-in">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#111111]">Texto del Banner</Label>
              <Input
                value={banner.texto}
                onChange={(e) => setBanner((prev) => ({ ...prev, texto: e.target.value }))}
                className="input-apple text-sm"
                placeholder="Ej: ¡Oferta especial! 20% de descuento"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#111111]">Color de Fondo</Label>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg border border-[#e5e5ea]"
                  style={{ backgroundColor: banner.colorFondo }}
                />
                <Input
                  value={banner.colorFondo}
                  onChange={(e) => setBanner((prev) => ({ ...prev, colorFondo: e.target.value }))}
                  className="input-apple text-sm font-mono flex-1"
                />
                <input
                  type="color"
                  value={banner.colorFondo}
                  onChange={(e) => setBanner((prev) => ({ ...prev, colorFondo: e.target.value }))}
                  className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#111111]">Texto del Botón</Label>
                <Input
                  value={banner.textoBoton}
                  onChange={(e) => setBanner((prev) => ({ ...prev, textoBoton: e.target.value }))}
                  className="input-apple text-sm"
                  placeholder="Aprovechar"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#111111]">Enlace del Botón</Label>
                <Input
                  value={banner.enlaceBoton}
                  onChange={(e) => setBanner((prev) => ({ ...prev, enlaceBoton: e.target.value }))}
                  className="input-apple text-sm font-mono"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#111111]">Posición (después de sección #)</Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3].map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setBanner((prev) => ({ ...prev, posicion: pos }))}
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-all',
                      banner.posicion === pos
                        ? 'bg-[#111111] text-white'
                        : 'bg-[#f5f5f7] text-[#86868b] hover:text-[#111111]'
                    )}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#111111]">Alineación del Texto</Label>
                <Select
                  value={banner.alineacion}
                  onValueChange={(val) => setBanner((prev) => ({ ...prev, alineacion: val as BannerPromocional['alineacion'] }))}
                >
                  <SelectTrigger className="input-apple text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="izquierda">Izquierda</SelectItem>
                    <SelectItem value="centro">Centro</SelectItem>
                    <SelectItem value="derecha">Derecha</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#111111]">Peso Tipográfico</Label>
                <Select
                  value={banner.pesoTipografico}
                  onValueChange={(val) => setBanner((prev) => ({ ...prev, pesoTipografico: val as BannerPromocional['pesoTipografico'] }))}
                >
                  <SelectTrigger className="input-apple text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="negrita">Negrita</SelectItem>
                    <SelectItem value="super-negrita">Súper Negrita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {banner.texto && (
              <div className="rounded-xl overflow-hidden shadow-sm">
                <div
                  className="px-4 py-3 flex items-center justify-between gap-4"
                  style={{ backgroundColor: banner.colorFondo }}
                >
                  <span className={cn('text-white text-sm truncate', bannerAlignClass, bannerWeightClass)}>
                    {banner.texto}
                  </span>
                  {banner.textoBoton && (
                    <button className="shrink-0 px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition-colors">
                      {banner.textoBoton}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
