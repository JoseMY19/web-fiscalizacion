import { ExpedienteResolucionItem, TipoResolucion } from '../../api';

import { formatearFecha, hoyLocal } from '../../lib/fechas';

export { hoyLocal };

/** dd/mm/aaaa — delega en el formateador único de `lib/fechas`. */
export function fechaCorta(iso: string | null | undefined): string {
  return formatearFecha(iso);
}

export function soloFechaIso(iso: string | null | undefined): string | undefined {
  return iso ? iso.slice(0, 10) : undefined;
}

export const NOMBRE_TIPO: Record<TipoResolucion, string> = {
  RSGSA: 'RSGSA — Sanción',
  RSG: 'RSG — A favor del administrado',
};

export const EXPLICACION_TIPO: Record<TipoResolucion, string> = {
  RSGSA:
    'Resolución Subgerencial de Sanción Administrativa: impone la multa y/o una medida complementaria (clausura, demolición…). Lo sugiere el IFI cuando recomienda sancionar.',
  RSG:
    'Resolución Subgerencial a favor del administrado: archiva el caso, sin multa. Exige un desarrollo extenso y retirar la multa del estado de cuenta. Lo sugiere el IFI cuando recomienda archivar.',
};

export const LABEL_FOTO_ACTA: Record<string, string> = {
  ACTA_FISCALIZACION: 'Foto del Acta de Fiscalización',
  NOTIFICACION_CARGO: 'Foto de la Notificación de Cargo',
  ACTA_EXHORTACION: 'Foto del Acta de Exhortación',
  MEDIDA_PROVISIONAL: 'Foto del Acta de Medida Provisional',
};

/** Texto de la etapa para la fila de la bandeja / buscador. */
export function labelEtapa(e: Pick<ExpedienteResolucionItem, 'etapa' | 'plazos' | 'resolucionId'>): string {
  switch (e.etapa) {
    case 'ESPERANDO_DESCARGO_IFI': {
      const n = e.plazos.diasHabilesEsperaRestantes ?? 0;
      return n > 0
        ? `Esperando descargo contra IFI — faltan ${n} día${n === 1 ? '' : 's'} hábil${n === 1 ? '' : 'es'}`
        : 'Esperando descargo contra IFI — hoy vence el plazo';
    }
    case 'EN_REDACCION':
      return e.resolucionId ? 'En redacción' : 'En redacción (sin iniciar)';
    case 'EN_FIRMA': {
      const n = e.plazos.diasEnFirma ?? 0;
      return `En firma hace ${n} día${n === 1 ? '' : 's'}`;
    }
    case 'FIRMADA':
      return 'Firmada, falta notificar';
    case 'NOTIFICADA':
      return 'Notificada';
  }
}

export function varianteEtapa(e: Pick<ExpedienteResolucionItem, 'etapa'>): 'warning' | 'info' | 'purple' | 'success' | 'neutral' {
  switch (e.etapa) {
    case 'ESPERANDO_DESCARGO_IFI':
      return 'warning';
    case 'EN_REDACCION':
      return 'info';
    case 'EN_FIRMA':
      return 'purple';
    case 'FIRMADA':
      return 'success';
    default:
      return 'neutral';
  }
}

/** "Caduca en N días" (rojo si faltan menos de 30). null = no aplica (NC sin notificar o resolución ya notificada). */
export function textoCaducidad(dias: number | null): { texto: string; urgente: boolean } | null {
  if (dias === null) return null;
  if (dias < 0) return { texto: `Caducó hace ${-dias} día${dias === -1 ? '' : 's'}`, urgente: true };
  return { texto: `Caduca en ${dias} día${dias === 1 ? '' : 's'}`, urgente: dias < 30 };
}
