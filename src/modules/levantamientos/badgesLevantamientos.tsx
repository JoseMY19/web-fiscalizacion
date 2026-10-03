import React from 'react';
import { ClockIcon } from '../../components/icons/Icons';
import type { NavModule } from '../../components/layout/AppLayout';
import type { ResumenLevantamientos } from './useResumenLevantamientos';

/**
 * Contador del menú para "Levantamiento de Medidas": solicitudes en
 * evaluación. ROJO si alguna está por vencer (< 24 h clausura / < 5 días
 * otras); si no, ámbar con reloj.
 */
export function badgesLevantamientos(r: ResumenLevantamientos): {
  counts: Partial<Record<NavModule, number>>;
  alertas: Partial<Record<NavModule, { count: number; title: string; icon?: React.ReactNode }>>;
} {
  if (r.abiertas === 0) return { counts: {}, alertas: {} };
  if (r.urgentes > 0) return { counts: { levantamientos: r.abiertas }, alertas: {} };
  return {
    counts: {},
    alertas: {
      levantamientos: {
        count: r.abiertas,
        title: `${r.abiertas} solicitud${r.abiertas === 1 ? '' : 'es'} de levantamiento en evaluación`,
        icon: <ClockIcon size={10} />,
      },
    },
  };
}
