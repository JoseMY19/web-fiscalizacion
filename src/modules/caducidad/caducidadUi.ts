import { CaducidadExpedienteItem, RegistroCaducidad, SiguientePasoCaducidad } from '../../api';
import { formatearFecha } from '../../lib/fechas';

type Variante = 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral' | 'midnight';

export const ETIQUETA_PASO_CADUCIDAD: Record<SiguientePasoCaducidad, string> = {
  INICIAR: 'Declarar de oficio / registrar solicitud',
  EVALUAR: 'Evaluar la solicitud',
  ENVIAR_A_FIRMA: 'Enviar RSG a firma',
  REGISTRAR_FIRMA: 'Registrar firma',
  NOTIFICAR: 'Notificar RSG',
  DECIDIR: '¿Nuevo PAS o archivo?',
  COMPLETO: 'Completo',
};

/** Texto y color del plazo de caducidad de un expediente. */
export function textoPlazoCaducidad(e: CaducidadExpedienteItem): { texto: string; variante: Variante } {
  const p = e.plazo;
  if (e.caducado) return { texto: 'Caducado', variante: 'midnight' };
  switch (p.estado) {
    case 'SIN_NC_NOTIFICADA':
      return { texto: 'NC sin notificar', variante: 'neutral' };
    case 'DETENIDO':
      return { texto: 'Resolución notificada a tiempo', variante: 'success' };
    case 'VENCIDO':
      return { texto: `Venció el ${formatearFecha(p.fechaLimite)}`, variante: 'danger' };
    case 'POR_CADUCAR':
      return { texto: `Caduca en ${p.diasRestantes} día${p.diasRestantes === 1 ? '' : 's'} (${formatearFecha(p.fechaLimite)})`, variante: 'warning' };
    default:
      return { texto: `Vence el ${formatearFecha(p.fechaLimite)} (${p.diasRestantes} días)`, variante: 'info' };
  }
}

/**
 * Trámite vigente para la UI: una denegatoria ya notificada queda cerrada
 * (pasa al historial) y el expediente vuelve a admitir un trámite nuevo.
 */
export function tramiteVigente(e: CaducidadExpedienteItem): RegistroCaducidad | null {
  const c = e.caducidad;
  return c && c.resultado === 'DENEGADA' && c.fechaNotificacion ? null : c;
}

/** Trámites cerrados (denegatorias notificadas), del más reciente al más antiguo. */
export function tramitesAnteriores(e: CaducidadExpedienteItem): RegistroCaducidad[] {
  return e.caducidad && !tramiteVigente(e) ? [e.caducidad, ...e.historial] : e.historial;
}

export function textoResultadoCaducidad(e: CaducidadExpedienteItem): { texto: string; variante: Variante } | null {
  const c = e.caducidad;
  if (!c) return null;
  if (!c.resultado) return { texto: 'Solicitud en evaluación', variante: 'info' };
  if (c.resultado === 'DENEGADA') return { texto: c.fechaNotificacion ? 'Denegada (notificada)' : 'Denegatoria en trámite', variante: 'neutral' };
  if (!c.fechaNotificacion) return { texto: 'Declaración en trámite', variante: 'warning' };
  if (c.decisionPosterior === 'NUEVO_PAS') return { texto: 'Caducado — nuevo PAS', variante: 'purple' };
  if (c.decisionPosterior === 'ARCHIVO') return { texto: 'Caducado — archivado', variante: 'midnight' };
  return { texto: 'Caducado — falta decidir', variante: 'danger' };
}

export function nombreArchivoRsgCaducidad(e: CaducidadExpedienteItem): string {
  return `${e.caducidad?.resultado === 'DENEGADA' ? 'rsg-caducidad-denegatoria' : 'rsg-caducidad'}-${e.numeroExpediente}.docx`;
}
