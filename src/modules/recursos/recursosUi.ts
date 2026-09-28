import { DecisionGop, ExpedienteRecursos, ResultadoReconsideracion, SituacionRecursos } from '../../api';
import { formatearFecha, hoyLocal } from '../../lib/fechas';

export { hoyLocal };

export function fechaCorta(iso: string | null | undefined): string {
  return formatearFecha(iso);
}

export const LABEL_SITUACION: Record<SituacionRecursos, string> = {
  SIN_ACTO_RECURRIBLE: 'Sin acto recurrible',
  PLAZO_ABIERTO: 'Plazo de recurso abierto',
  PLAZO_VENCIDO: 'Plazo de recurso vencido',
  RECONSIDERACION_EN_TRAMITE: 'Reconsideración en trámite',
  EN_APELACION: 'En apelación (GOP)',
  CONCLUIDO_A_FAVOR: 'Concluido a favor del administrado',
  APELACION_INFUNDADA: 'Apelación infundada — vía agotada',
  NULIDAD_PENDIENTE: 'Nulidad (pendiente de definir con legal)',
};

export function varianteSituacion(s: SituacionRecursos): 'warning' | 'info' | 'purple' | 'success' | 'neutral' | 'danger' {
  switch (s) {
    case 'PLAZO_ABIERTO':
      return 'warning';
    case 'RECONSIDERACION_EN_TRAMITE':
      return 'info';
    case 'EN_APELACION':
      return 'purple';
    case 'CONCLUIDO_A_FAVOR':
      return 'success';
    case 'NULIDAD_PENDIENTE':
      return 'danger';
    default:
      return 'neutral';
  }
}

export const LABEL_RESULTADO: Record<ResultadoReconsideracion, string> = {
  FUNDADA: 'Fundada',
  INFUNDADA: 'Infundada',
  IMPROCEDENTE: 'Improcedente (sin nueva prueba)',
};

export const LABEL_DECISION_GOP: Record<DecisionGop, string> = {
  FUNDADA: 'Fundada — se deja sin efecto la sanción',
  INFUNDADA: 'Infundada — se agota la vía administrativa (acto firme)',
  NULIDAD: 'Nulidad — el expediente vuelve atrás',
};

/** "Quedan N días hábiles" (urgente si faltan 3 o menos). null = no aplica. */
export function textoPlazoRecurso(e: Pick<ExpedienteRecursos, 'diasHabilesRestantes' | 'fechaLimiteRecurso'>): { texto: string; urgente: boolean } | null {
  const n = e.diasHabilesRestantes;
  if (n === null || !e.fechaLimiteRecurso) return null;
  if (n < 0) return { texto: `Venció el ${fechaCorta(e.fechaLimiteRecurso)}`, urgente: false };
  if (n === 0) return { texto: `Vence hoy (${fechaCorta(e.fechaLimiteRecurso)})`, urgente: true };
  return { texto: `Quedan ${n} día${n === 1 ? '' : 's'} hábil${n === 1 ? '' : 'es'} (hasta el ${fechaCorta(e.fechaLimiteRecurso)})`, urgente: n <= 3 };
}

export function textoUltimoActo(e: ExpedienteRecursos): string {
  const a = e.ultimoActo;
  if (!a) return '—';
  const nombre = a.esRsgDeReconsideracion ? 'RSG que resolvió la reconsideración' : 'Resolución de primera instancia';
  return `${nombre}${a.numeroResolucion ? ` N° ${a.numeroResolucion}` : ''}, notificada el ${fechaCorta(a.fechaNotificacion)}`;
}
