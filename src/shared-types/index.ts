/**
 * Fuente única de verdad para enums que usan tanto el backend como
 * apps/web-campo y apps/web-oficina. Si cambias un valor acá, cambia
 * en todos lados a la vez — ese es el punto de este paquete.
 * Espejo de los enums en apps/backend/prisma/schema.prisma.
 */

export { calcularMontoPasibleMulta } from './calculos';
export { sumarDiasHabiles, sumarMesesCalendario, diasHabilesRestantes } from './plazos';

export enum OrigenIntervencion {
  DENUNCIA = 'DENUNCIA',
  INOPINADA = 'INOPINADA',
  ORDEN_SUPERIOR = 'ORDEN_SUPERIOR',
  DOC_EXTERNO = 'DOC_EXTERNO',
  // Pedido explícito de negocio (reunión 2026-09): siempre debe quedar una
  // salida abierta para orígenes que no encajan en las 4 categorías fijas.
  OTROS = 'OTROS',
}

export enum TipoActuacion {
  EXHORTACION = 'EXHORTACION',
  CONSTATACION = 'CONSTATACION',
  INICIA_PAS = 'INICIA_PAS',
}

export enum EstadoIntervencion {
  BORRADOR = 'BORRADOR',
  PENDIENTE_SYNC = 'PENDIENTE_SYNC',
  SINCRONIZADO = 'SINCRONIZADO',
  CONFLICTO = 'CONFLICTO',
}

// HU-01: cómo se obtuvo (o no) la ubicación. No confundir con
// EstadoIntervencion, que es del ciclo de sincronización — esto es
// completitud de datos de captura.
export enum OrigenUbicacion {
  GPS_AUTOMATICO = 'GPS_AUTOMATICO',
  DIRECCION_MANUAL = 'DIRECCION_MANUAL',
  SIN_UBICACION = 'SIN_UBICACION',
}

export enum ModoNotificacion {
  PERSONAL_FIRMA = 'PERSONAL_FIRMA',
  PERSONAL_NEGATIVA = 'PERSONAL_NEGATIVA',
  DOMICILIARIA_PENDIENTE = 'DOMICILIARIA_PENDIENTE',
  DOMICILIARIA_EFECTIVA = 'DOMICILIARIA_EFECTIVA',
}

export enum MotivoNoIdentificado {
  VIA_PUBLICA = 'VIA_PUBLICA',
  SIN_OCUPANTE = 'SIN_OCUPANTE',
  SE_NEGO = 'SE_NEGO',
  OTRO = 'OTRO',
}

/**
 * HU-11/HU-13: ningún campo del catálogo CUIS indica hoy cuál aplica por
 * código (ver docs/cuis/reporte-calidad.md, pendiente de auditoría legal)
 * — por eso el fiscalizador lo elige explícitamente, nunca hay preselección.
 */
export enum BaseCalculo {
  UIT_FIJO = 'UIT_FIJO',
  VALOR_OBRA = 'VALOR_OBRA',
  POR_VOLUMEN = 'POR_VOLUMEN',
  // Pedido explícito de negocio (reunión 2026-09): puede haber ordenanzas
  // que calculen la multa de otra forma no contemplada todavía — nunca se
  // fuerza a UIT/Valor de Obra/Volumen como default silencioso.
  OTROS = 'OTROS',
}

export interface ParametroUitDto {
  id: string;
  anio: number;
  valorSoles: number;
  vigenteDesde: string; // ISO date
  vigenteHasta: string | null;
}

export interface CuisCodigoDto {
  id: string;
  codigo: string;
  descripcion: string | null;
  requiereDesambiguacion: boolean;
  escalas: {
    id: string;
    escala: 'L' | 'G' | 'MG';
    condicion: string | null;
    porcentaje: number;
    // HU-08: "medida complementaria" no se expone todavía — su extracción
    // está marcada NO CONFIABLE en docs/cuis/reporte-calidad.md.
    medidaProvisional: string | null;
  }[];
  // HU-14: booleano calculado en el backend (categoría 8 · Urbanismo).
  sugiereValorizacionObra: boolean;
}

/**
 * HU-16: qué tabla de acta corresponde, para la verificación de unicidad
 * de numeroCorrelativo contra el backend (GET /actas/correlativo-disponible).
 */
export enum TipoActa {
  EXHORTACION = 'EXHORTACION',
  FISCALIZACION = 'FISCALIZACION',
  NOTIFICACION_CARGO = 'NOTIFICACION_CARGO',
  MEDIDA_PROVISIONAL = 'MEDIDA_PROVISIONAL',
  VALORIZACION_OBRA = 'VALORIZACION_OBRA',
  ADICIONAL = 'ADICIONAL',
}
