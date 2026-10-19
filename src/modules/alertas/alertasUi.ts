import type { Alerta, CategoriaAlerta, FaseExpediente, GrupoAlerta, NivelAlerta } from '../../api/alertas';
import type { TonoContador } from '../../components/common/PageKit';

/** Leyenda de riesgo: los mismos 4 niveles y colores en la campana, el panel y la página. */
export const NIVELES: NivelAlerta[] = ['VENCIDO', 'CRITICO', 'POR_VENCER', 'EN_PLAZO'];

export const NIVEL_META: Record<NivelAlerta, { etiqueta: string; descripcion: string; chip: string; barra: string; texto: string }> = {
  VENCIDO: {
    etiqueta: 'Vencido',
    descripcion: 'El plazo ya pasó y no se actuó',
    chip: 'bg-red-800 text-white border-red-800',
    barra: 'bg-red-800',
    texto: 'text-red-800',
  },
  CRITICO: {
    etiqueta: 'Crítico',
    descripcion: 'Vence hoy o en muy poco tiempo',
    chip: 'bg-danger-bg text-danger border-danger-border',
    barra: 'bg-danger',
    texto: 'text-danger',
  },
  POR_VENCER: {
    etiqueta: 'Por vencer',
    descripcion: 'Dentro del margen de aviso',
    chip: 'bg-warning-bg text-warning border-warning-border',
    barra: 'bg-warning',
    texto: 'text-warning',
  },
  EN_PLAZO: {
    etiqueta: 'En plazo',
    descripcion: 'Sin riesgo, o ya listo para actuar',
    chip: 'bg-info-bg text-info border-info-border',
    barra: 'bg-info',
    texto: 'text-text-muted',
  },
};

export const CATEGORIA_META: Record<CategoriaAlerta, { etiqueta: string; ayuda: string }> = {
  LIMITE: { etiqueta: 'Plazo límite', ayuda: 'Si vence, se pierde algo (caducidad, medida, firma demorada)' },
  ESPERA: { etiqueta: 'Espera legal', ayuda: 'Plazo que debe cumplirse antes de poder actuar (descargo, recurso)' },
  ACCION: { etiqueta: 'Para actuar', ayuda: 'Ya se puede o se debe hacer el siguiente paso' },
};

export const FASES: { id: FaseExpediente; etiqueta: string }[] = [
  { id: 'VALIDACION', etiqueta: 'Validación' },
  { id: 'NOTIFICACION_NC', etiqueta: 'Notificación de la NC' },
  { id: 'INSTRUCCION', etiqueta: 'Instrucción (IFI)' },
  { id: 'RESOLUCION', etiqueta: 'Resolución' },
  { id: 'RECURSOS', etiqueta: 'Recursos' },
  { id: 'ACTO_FIRME', etiqueta: 'Acto firme' },
  { id: 'COACTIVA', etiqueta: 'Ejecución coactiva' },
  { id: 'CONCLUIDO', etiqueta: 'Concluido' },
];

/**
 * Etiqueta de estado de una alerta. Una tarea ya habilitada o una espera legal no
 * están "en plazo": se dice "Para actuar" o "En espera", y el riesgo solo se muestra cuando lo hay.
 */
export function chipDe(a: Pick<Alerta, 'nivel' | 'categoria'>): { etiqueta: string; clase: string } {
  if (a.nivel === 'EN_PLAZO' && a.categoria === 'ACCION') return { etiqueta: 'Para actuar', clase: 'bg-blue-50 text-blue-800 border-blue-100' };
  if (a.nivel === 'EN_PLAZO' && a.categoria === 'ESPERA') return { etiqueta: 'En espera', clase: 'bg-bg-subtle text-text-muted border-border' };
  return { etiqueta: NIVEL_META[a.nivel].etiqueta, clase: NIVEL_META[a.nivel].chip };
}

/** Grupos de la página de alertas (una tarjeta por expediente). */
export const GRUPOS: GrupoAlerta[] = ['URGENTE', 'POR_VENCER', 'ACTUAR', 'SEGUIMIENTO'];

export const GRUPO_META: Record<GrupoAlerta, { etiqueta: string; descripcion: string; barra: string; texto: string; chip: string }> = {
  URGENTE: {
    etiqueta: 'Vencido o crítico',
    descripcion: 'Un plazo ya venció o vence muy pronto',
    barra: 'bg-danger',
    texto: 'text-danger',
    chip: 'bg-danger-bg text-danger border-danger-border',
  },
  POR_VENCER: {
    etiqueta: 'Por vencer',
    descripcion: 'Un plazo entra en margen de aviso',
    barra: 'bg-warning',
    texto: 'text-warning',
    chip: 'bg-warning-bg text-warning border-warning-border',
  },
  ACTUAR: {
    etiqueta: 'Para actuar',
    descripcion: 'Ya puedes dar el siguiente paso',
    barra: 'bg-blue-800',
    texto: 'text-blue-800',
    chip: 'bg-blue-50 text-blue-800 border-blue-100',
  },
  SEGUIMIENTO: {
    etiqueta: 'En seguimiento',
    descripcion: 'Plazos corriendo, sin riesgo',
    barra: 'bg-border-dark',
    texto: 'text-text-muted',
    chip: 'bg-bg-subtle text-text-muted border-border',
  },
};

/** Pestañas de la página de alertas: lo que pide atención (por defecto) o un grupo puntual. */
export type VistaAlertas = GrupoAlerta | 'ATENCION';

/** Pestañas de filtro de la página de alertas: nombre y color del contador cuando hay expedientes. */
export const VISTA_META: Record<VistaAlertas, { etiqueta: string; tono?: TonoContador }> = {
  ATENCION: { etiqueta: 'Requieren atención' },
  URGENTE: { etiqueta: GRUPO_META.URGENTE.etiqueta, tono: 'danger' },
  POR_VENCER: { etiqueta: GRUPO_META.POR_VENCER.etiqueta, tono: 'warning' },
  ACTUAR: { etiqueta: GRUPO_META.ACTUAR.etiqueta },
  SEGUIMIENTO: { etiqueta: GRUPO_META.SEGUIMIENTO.etiqueta },
};

/** Línea de fases del expediente (de izquierda a derecha, como avanza el trámite). */
export const PASOS_FASE: { id: FaseExpediente; etiqueta: string }[] = [
  { id: 'VALIDACION', etiqueta: 'Validación' },
  { id: 'NOTIFICACION_NC', etiqueta: 'Notif. NC' },
  { id: 'INSTRUCCION', etiqueta: 'IFI' },
  { id: 'RESOLUCION', etiqueta: 'Resolución' },
  { id: 'RECURSOS', etiqueta: 'Recursos' },
  { id: 'ACTO_FIRME', etiqueta: 'Acto firme' },
  { id: 'COACTIVA', etiqueta: 'Coactiva' },
];

/** Nombre del módulo al que lleva cada alerta (botón "Ir a …"). */
export const ETIQUETA_MODULO: Record<string, string> = {
  expedientes: 'Validación',
  notificaciones: 'Notificación de Cédulas',
  ifi: 'Instrucción e IFI',
  resoluciones: 'Resolución',
  caducidad: 'Caducidad',
  recursos: 'Recursos',
  'coactiva-pagos': 'Acto Firme',
  coactiva: 'Ejecución Coactiva',
  levantamientos: 'Levantamientos',
};

/** "hoy", "hace 1 día", "hace 3 días". */
export function haceDias(dias: number): string {
  if (dias <= 0) return 'hoy';
  return `hace ${dias} día${dias === 1 ? '' : 's'}`;
}

/** Misma clase base para todos los chips de nivel. */
export const CHIP_BASE = 'inline-flex items-center rounded-[6px] border font-semibold whitespace-nowrap';
