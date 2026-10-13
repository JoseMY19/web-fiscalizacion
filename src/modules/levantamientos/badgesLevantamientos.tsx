import React from 'react';
import type { NavModule } from '../../components/layout/AppLayout';
import type { ResumenLevantamientos } from './useResumenLevantamientos';

/**
 * Indicadores del menú para "Levantamiento de Medidas": el número de
 * solicitudes en evaluación (discreto) y, si alguna está por vencer
 * (< 24 h clausura / < 5 días otras medidas), un punto rojo con aviso.
 */
export function badgesLevantamientos(r: ResumenLevantamientos): {
  counts: Partial<Record<NavModule, number>>;
  alertas: Partial<Record<NavModule, { count: number; title: string; icon?: React.ReactNode }>>;
} {
  if (r.abiertas === 0) return { counts: {}, alertas: {} };
  const counts = { levantamientos: r.abiertas };
  if (r.urgentes > 0) {
    return {
      counts,
      alertas: {
        levantamientos: {
          count: r.urgentes,
          title: `${r.urgentes} solicitud${r.urgentes === 1 ? '' : 'es'} de levantamiento por vencer`,
        },
      },
    };
  }
  return { counts, alertas: {} };
}
