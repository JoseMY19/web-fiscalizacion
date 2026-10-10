import type { CategoriaAlerta, FaseExpediente, NivelAlerta } from '../../api/alertas';

/** Leyenda de riesgo: los mismos 4 niveles y colores en la campana, el panel y la página. */
export const NIVELES: NivelAlerta[] = ['VENCIDO', 'CRITICO', 'POR_VENCER', 'EN_PLAZO'];

export const NIVEL_META: Record<NivelAlerta, { etiqueta: string; descripcion: string; chip: string; barra: string }> = {
  VENCIDO: {
    etiqueta: 'Vencido',
    descripcion: 'El plazo ya pasó y no se actuó',
    chip: 'bg-[#991b1b] text-white border-[#991b1b]',
    barra: 'bg-[#991b1b]',
  },
  CRITICO: {
    etiqueta: 'Crítico',
    descripcion: 'Vence hoy o en muy poco tiempo',
    chip: 'bg-danger-bg text-danger border-danger-border',
    barra: 'bg-danger',
  },
  POR_VENCER: {
    etiqueta: 'Por vencer',
    descripcion: 'Dentro del margen de aviso',
    chip: 'bg-warning-bg text-warning border-warning-border',
    barra: 'bg-warning',
  },
  EN_PLAZO: {
    etiqueta: 'En plazo',
    descripcion: 'Sin riesgo, o ya listo para actuar',
    chip: 'bg-info-bg text-info border-info-border',
    barra: 'bg-info',
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

/** Misma clase base para todos los chips de nivel. */
export const CHIP_BASE = 'inline-flex items-center rounded-[6px] border font-semibold whitespace-nowrap';
