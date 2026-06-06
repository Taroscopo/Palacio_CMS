'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Upload } from 'lucide-react';
import type { ImageUploaderProps } from './types';

// ============================================================
// Componente: ImageUploader — Input de archivo con validación
// de 4MB y vista previa de imagen
// ============================================================

export function ImageUploader({
  campoId,
  currentValue,
  isUploading,
  onUpload,
  onFocus,
  onBlur,
  campoRef,
}: ImageUploaderProps) {
  return (
    <div className="space-y-2">
      {/* Vista previa de la imagen actual */}
      {currentValue && (
        <div className="relative w-full h-24 rounded-lg overflow-hidden bg-[#f5f5f7] border border-[#e5e5ea]">
          <img src={currentValue} alt="Preview" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Input de archivo oculto */}
      <input
        type="file"
        accept="image/*"
        onChange={(e) => onUpload(campoId, e)}
        onFocus={onFocus}
        onBlur={onBlur}
        className="hidden"
        id={`file-${campoId}`}
      />

      {/* Botón visible que dispara el selector de archivos */}
      <Button
        variant="outline"
        onClick={() => document.getElementById(`file-${campoId}`)?.click()}
        onFocus={onFocus}
        onBlur={onBlur}
        ref={(el) => { if (el) campoRef(el); }}
        className="w-full"
        disabled={isUploading}
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Upload className="w-4 h-4 mr-2" />
        )}
        {isUploading ? 'Subiendo...' : 'Elegir Foto Local'}
      </Button>
    </div>
  );
}
