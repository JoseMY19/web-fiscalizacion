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
  ACTA_MEDIDA_PROVISIONAL: 'Foto del Acta de Medida Provisional',
  ACTA_ADICIONAL: 'Foto del Acta Adicional',
  ACTA_VALORIZACION_OBRA: 'Foto del Acta de Valorización de Obra',
  MEDIDA_PROVISIONAL_EJECUCION: 'Foto de la medida provisional ejecutada',
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

/** EN_FIRMA se pinta según los días en firma (O5): morado → ámbar (>5) → rojo (>10). */
export function varianteEtapa(
  e: Pick<ExpedienteResolucionItem, 'etapa'> & { plazos?: { diasEnFirma: number | null } },
): 'warning' | 'info' | 'purple' | 'success' | 'neutral' | 'danger' {
  switch (e.etapa) {
    case 'ESPERANDO_DESCARGO_IFI':
      return 'warning';
    case 'EN_REDACCION':
      return 'info';
    case 'EN_FIRMA':
      return varianteDiasEnFirma(e.plazos?.diasEnFirma);
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

/** O5: días en firma desde los que la fila se pinta ámbar / roja. */
export const DIAS_FIRMA_AMBAR = 5;
export const DIAS_FIRMA_ROJO = 10;

/** O5: color del "En firma hace N días": morado normal, ámbar pasados 5 días, rojo pasados 10. */
export function varianteDiasEnFirma(dias: number | null | undefined): 'purple' | 'warning' | 'danger' {
  if (dias == null) return 'purple';
  if (dias > DIAS_FIRMA_ROJO) return 'danger';
  if (dias > DIAS_FIRMA_AMBAR) return 'warning';
  return 'purple';
}

/** Días calendario desde una fecha de calendario (ej. fechaEnvioFirma) hasta hoy (Lima). null si no hay fecha. */
export function diasDesde(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  const [ha, hm, hd] = hoyLocal().split('-').map(Number);
  return Math.max(0, Math.round((Date.UTC(ha, hm - 1, hd) - Date.UTC(a, m - 1, d)) / 86_400_000));
}
