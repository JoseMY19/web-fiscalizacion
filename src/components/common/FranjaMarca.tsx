import React from 'react';
import { cn } from '../../lib/cn';

/** Colores de las letras del logo, en orden. */
export const COLORES_MARCA = ['bg-sjl-rojo', 'bg-sjl-magenta', 'bg-sjl-naranja', 'bg-sjl-verde', 'bg-sjl-turquesa'];

/** Franja institucional con los colores del logo de San Juan de Lurigancho. */
export const FranjaMarca: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('flex h-[4px] w-full overflow-hidden', className)} aria-hidden>
    {COLORES_MARCA.map((color) => (
      <span key={color} className={cn('flex-1', color)} />
    ))}
  </div>
);
