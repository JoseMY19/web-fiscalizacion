import { CasoCoactivoItem, ClaseSuspension, EstadoCoactivo, FormaMedidaCautelar, MotivoSuspension, TipoResolucionCoactiva } from '../../api';
import { formatearFecha } from '../../lib/fechas';

type Variante = 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral' | 'midnight';

export const LABEL_TIPO_REC: Record<TipoResolucionCoactiva, string> = {
  REQUERIMIENTO_PAGO: 'Requerimiento de pago (7 días hábiles)',
  MEDIDA_CAUTELAR: 'Medida cautelar (embargo)',
  EJECUCION_MEDIDA_COMPLEMENTARIA: 'Ejecución de la medida complementaria',
  LEVANTAMIENTO_MEDIDA: 'Levantamiento de medida / embargo',
  SUSPENSION: 'Resuelve suspensión',
  CUMPLIMIENTO_ARCHIVO: 'Cumplimiento y archivo',
  OTRA: 'Otra (escritos, terceros…)',
};

export const LABEL_FORMA_MEDIDA: Record<FormaMedidaCautelar, string> = {
  RETENCION_BANCARIA: 'Retención bancaria',
  INSCRIPCION: 'Inscripción (vehículo / inmueble)',
  DEPOSITO_SECUESTRO: 'Depósito o secuestro',
  INTERVENCION: 'Intervención (recaudación)',
  OTRA: 'Otra',
};

export const LABEL_CLASE_SUSPENSION: Record<ClaseSuspension, string> = { TEMPORAL: 'Temporal', DEFINITIVA: 'Definitiva' };

export const LABEL_MOTIVO_SUSPENSION: Record<MotivoSuspension, string> = {
  PAGO: 'Pagó',
  NO_ES_OBLIGADO: 'No es el obligado',
  MALA_NOTIFICACION: 'Mala notificación',
  MANDATO_JUDICIAL: 'Mandato / sentencia judicial',
  REVISION_JUDICIAL: 'Revisión judicial',
  CAUTELAR_JUDICIAL: 'Medida cautelar judicial',
  OTRO: 'Otro',
};

/** Motivos típicos por clase (dicho por coactivo); "Otro" siempre disponible. */
export const MOTIVOS_POR_CLASE: Record<ClaseSuspension, MotivoSuspension[]> = {
  DEFINITIVA: ['PAGO', 'NO_ES_OBLIGADO', 'MALA_NOTIFICACION', 'MANDATO_JUDICIAL', 'OTRO'],
  TEMPORAL: ['REVISION_JUDICIAL', 'CAUTELAR_JUDICIAL', 'OTRO'],
};

const ESTADO: Record<EstadoCoactivo, { texto: string; variante: Variante }> = {
  EN_ESPERA: { texto: 'En espera (90 días)', variante: 'neutral' },
  POR_INICIAR: { texto: 'Por iniciar', variante: 'warning' },
  INICIADO: { texto: 'Iniciado — falta REC 1', variante: 'info' },
  REQUERIDO: { texto: 'Requerido (REC 1)', variante: 'info' },
  MEDIDA_CAUTELAR: { texto: 'Con medida cautelar', variante: 'danger' },
  SUSPENDIDO_TEMPORAL: { texto: 'Suspendido (temporal)', variante: 'purple' },
  SUSPENDIDO_DEFINITIVO: { texto: 'Suspendido (definitivo)', variante: 'purple' },
  DEVUELTO_PAS: { texto: 'Devuelto a PAS', variante: 'warning' },
  PAGADO_MEDIDA_PENDIENTE: { texto: 'Pagó — medida pendiente', variante: 'success' },
  PAGADO: { texto: 'Pagó — archivar', variante: 'success' },
  ARCHIVADO: { texto: 'Archivado', variante: 'midnight' },
};

export const estadoCoactivo = (e: EstadoCoactivo) => ESTADO[e];

/** Qué falta hacer, en una línea. */
export function siguientePasoCoactivo(c: CasoCoactivoItem): string {
  const s = c.situacion;
  switch (s.estado) {
    case 'EN_ESPERA':
      return `Se puede iniciar desde el ${formatearFecha(s.habilitadoDesde)} (faltan ${s.diasParaHabilitar} días).`;
    case 'POR_INICIAR':
      return 'Registrar el N° de expediente coactivo e iniciar.';
    case 'INICIADO':
      return 'Registrar y notificar el requerimiento de pago (REC 1).';
    case 'REQUERIDO':
      return s.requerimientoVencido
        ? `Venció el plazo del requerimiento (${formatearFecha(s.venceRequerimiento)}): corresponde medida cautelar.`
        : `Corren los 7 días hábiles del requerimiento (vence el ${formatearFecha(s.venceRequerimiento)}).`;
    case 'MEDIDA_CAUTELAR':
      return 'Seguir la ejecución de la(s) medida(s) cautelar(es).';
    case 'SUSPENDIDO_TEMPORAL':
      return 'Suspendido: registrar el fin de la suspensión cuando corresponda.';
    case 'SUSPENDIDO_DEFINITIVO':
      return 'Suspensión definitiva: corresponde el archivo.';
    case 'DEVUELTO_PAS':
      return 'En la oficina de PAS: renotificar y retornar, o archivar si prescribió.';
    case 'PAGADO_MEDIDA_PENDIENTE':
      return 'Pagó la multa: no embargar. Falta cumplir la medida complementaria.';
    case 'PAGADO':
      return 'Pagó la multa: no embargar. Corresponde el archivo.';
    case 'ARCHIVADO':
      return 'Concluido.';
  }
}

export const montoSoles = (n: number | null | undefined): string =>
  n == null ? '—' : `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
