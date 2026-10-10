import React from 'react';
import { Badge } from './Common';
import { formatearFecha } from '../../lib/fechas';

/** 'S/ 1,234.50' — mismo formato de montos que el resto de la oficina. */
export function montoSoles(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface Props {
  tienePago: boolean | null | undefined;
  montoPagado?: number | null;
  fechaPago?: string | Date | null;
  size?: 'sm' | 'md';
}

/**
 * O9: etiqueta verde "Pagado (S/ X el dd/mm/aaaa)" — visible en IFI,
 * Resoluciones, Recursos y Acto firme, antes de seguir trabajando el caso.
 * No renderiza nada si no hay pago.
 */
export const PagadoBadge: React.FC<Props> = ({ tienePago, montoPagado, fechaPago, size = 'sm' }) => {
  if (!tienePago) return null;
  const detalle = montoPagado != null ? ` (${montoSoles(montoPagado)}${fechaPago ? ` el ${formatearFecha(fechaPago)}` : ''})` : '';
  return (
    <Badge variant="success" size={size}>
      Pagado{detalle}
    </Badge>
  );
};
