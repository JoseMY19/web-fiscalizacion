import React from 'react';

/** Tarjetas vacías con brillo mientras llega la primera carga de una bandeja. */
export const EsqueletoTarjetas: React.FC<{ cantidad?: number; alto?: number }> = ({ cantidad = 3, alto = 96 }) => (
  <div className="flex flex-col gap-[12px]" aria-busy="true" aria-label="Cargando">
    {Array.from({ length: cantidad }, (_, i) => (
      <div key={i} style={{ height: alto }} className="rounded-lg bg-bg-card border border-border animate-pulse" />
    ))}
  </div>
);
