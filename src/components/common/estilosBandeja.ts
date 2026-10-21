import type React from 'react';
import { cn } from '../../lib/cn';

/**
 * Estilos comunes de las tarjetas de bandeja (una tarjeta por expediente o
 * cédula): barra lateral de color, entrada escalonada y elevación al pasar el
 * mouse. Cada módulo define sus columnas con `grid-cols-*` encima de esta base.
 */
export const CLASE_TARJETA_BANDEJA = cn(
  'relative overflow-hidden rounded-lg bg-bg-card border border-border shadow-xs pl-[24px] pr-[20px] py-[16px]',
  'grid gap-[16px] items-center grid-cols-1',
  '[transition:transform_250ms_cubic-bezier(0.2,0.8,0.2,1),box-shadow_250ms,border-color_250ms] hover:-translate-y-[2px] hover:shadow-md hover:border-border-dark',
  'animate-aparecer',
);

/** Barra vertical de color a la izquierda de la tarjeta (se le suma el color, ej. 'bg-warning'). */
export const BARRA_LATERAL = 'absolute left-0 top-0 bottom-0 w-[4px]';

/** Etiqueta pequeña sobre cada dato de la tarjeta. */
export const ETIQUETA_COLUMNA = 'block text-[10.5px] font-bold uppercase tracking-[1px] text-text-light mb-[6px]';

/** Acción principal de la tarjeta: píldora azul (blue-800). */
export const BOTON_PILDORA =
  'group inline-flex items-center gap-[6px] h-[34px] px-[14px] rounded-pill border-0 bg-blue-800 text-white text-[12.5px] font-bold cursor-pointer whitespace-nowrap shadow-[0_4px_12px_-4px_rgba(29,79,145,0.5)] [transition:background-color_200ms,transform_200ms] hover:bg-blue-900 hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed';

/** Acción secundaria de la tarjeta: píldora blanca con borde. */
export const BOTON_PILDORA_SECUNDARIO =
  'inline-flex items-center gap-[6px] h-[34px] px-[14px] rounded-pill border border-border-dark bg-white text-text-main text-[12.5px] font-bold cursor-pointer whitespace-nowrap [transition:background-color_200ms] hover:bg-bg-subtle';

/** Chip de estado en píldora (se le suma el color, ej. 'bg-warning-bg border-warning-border text-warning'). */
export const CHIP_ESTADO = 'inline-flex items-center gap-[6px] py-[4px] px-[10px] rounded-pill border text-[12px] font-semibold';

/** Variantes de estado que calculan los módulos (`varianteEtapa`, `varianteSituacion`…). */
export type VarianteChip = 'warning' | 'info' | 'purple' | 'success' | 'neutral' | 'danger';

/** Color del chip según la variante ("info" usa el acento rosa del sistema). */
export const CHIP_POR_VARIANTE: Record<VarianteChip, string> = {
  warning: 'bg-warning-bg border-warning-border text-warning',
  info: 'bg-blue-50 border-blue-100 text-blue-800',
  purple: 'bg-purple-bg border-purple-border text-purple',
  success: 'bg-success-bg border-success-border text-success',
  neutral: 'bg-bg-subtle border-border text-text-secondary',
  danger: 'bg-danger-bg border-danger-border text-danger',
};

/** Color de la barra lateral de la tarjeta según la variante. */
export const BARRA_POR_VARIANTE: Record<VarianteChip, string> = {
  warning: 'bg-warning',
  info: 'bg-blue-800',
  purple: 'bg-purple',
  success: 'bg-success',
  neutral: 'bg-border-dark',
  danger: 'bg-danger',
};

/** Chip para textos largos: esquinas suaves en vez de píldora, porque puede ocupar dos líneas. */
export const CHIP_BLOQUE = 'inline-flex items-center gap-[6px] py-[4px] px-[10px] rounded-md border text-[12px] font-semibold leading-[1.35]';

/** Retraso de la entrada escalonada según la posición en la lista (tope de 8 para listas largas). */
export const retrasoEntrada = (indice: number): React.CSSProperties => ({ animationDelay: `${Math.min(indice, 8) * 50}ms` });
