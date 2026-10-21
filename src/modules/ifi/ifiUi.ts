import type { ExpedienteIfiItem } from '../../api';
import { textoCaducidad } from '../resoluciones/resolucionUi';

/** Filtros de la bandeja de instrucción. */
export type FiltroIfi = 'pendientes' | 'esperando';

export function labelEstadoIfi(e: ExpedienteIfiItem): string {
  if (!e.ifiEstado) return 'Sin iniciar';
  if (e.ifiEstado === 'EN_ELABORACION') return 'En elaboración';
  if (e.ifiEstado === 'EMITIDO') return 'Emitido';
  return 'Notificado';
}

/** Color del chip de estado del IFI. */
export function chipEstadoIfi(e: ExpedienteIfiItem): string {
  if (e.ifiEstado === 'NOTIFICADO') return 'bg-success-bg border-success-border text-success';
  if (e.ifiEstado === 'EMITIDO') return 'bg-blue-50 border-blue-100 text-blue-800';
  if (e.ifiEstado === 'EN_ELABORACION') return 'bg-warning-bg border-warning-border text-warning';
  return 'bg-bg-subtle border-border text-text-secondary';
}

/**
 * Calcula en qué paso está el expediente, para el indicador compacto de la
 * bandeja y para decidir qué paso queda habilitado en el panel de detalle.
 * Ramas:
 *  - imputacionCorrecta === false (vicio trascendente insubsanable): la
 *    recomendación ya quedó fijada en ARCHIVAR desde SanearImputacionUseCase.
 *    No hay "Hechos y Base Legal" que generar (no hay hechos válidos que
 *    redactar), así que este camino salta directo a Análisis (la
 *    fundamentación del archivo) → Firmar → Notificar, 5 pasos en vez de 7.
 */
export function calcularPaso(e: ExpedienteIfiItem): { pasoActualLabel: string; totalPasos: number; pasoNumero: number } {
  if (e.imputacionCorrecta === false) {
    if (!e.tieneAnalisis) return { pasoActualLabel: 'Análisis (fundamentar archivo)', totalPasos: 5, pasoNumero: 3 };
    if (e.ifiEstado === 'EN_ELABORACION') return { pasoActualLabel: 'Firmar', totalPasos: 5, pasoNumero: 4 };
    if (e.ifiEstado === 'EMITIDO') return { pasoActualLabel: 'Notificar', totalPasos: 5, pasoNumero: 5 };
    return { pasoActualLabel: 'Completado (archivado por vicio)', totalPasos: 5, pasoNumero: 5 };
  }
  if (!e.ifiEstado) return { pasoActualLabel: 'Descargo / Sanear Imputación', totalPasos: 7, pasoNumero: 1 };
  if (e.imputacionCorrecta !== true) return { pasoActualLabel: 'Sanear Imputación', totalPasos: 7, pasoNumero: 2 };
  if (!e.tieneSeccionAutomatica) return { pasoActualLabel: 'Hechos y Base Legal', totalPasos: 7, pasoNumero: 3 };
  if (!e.tieneAnalisis) return { pasoActualLabel: 'Análisis', totalPasos: 7, pasoNumero: 4 };
  if (!e.recomendacion) return { pasoActualLabel: 'Recomendación', totalPasos: 7, pasoNumero: 5 };
  if (e.ifiEstado === 'EN_ELABORACION') return { pasoActualLabel: 'Firmar', totalPasos: 7, pasoNumero: 6 };
  if (e.ifiEstado === 'EMITIDO') return { pasoActualLabel: 'Notificar', totalPasos: 7, pasoNumero: 7 };
  return { pasoActualLabel: 'Completado', totalPasos: 7, pasoNumero: 7 };
}

/** Requiere atención: hay que emitir la RSG de ampliación o el plazo de caducidad está cerca (o ya pasó). */
export function esUrgenteIfi(e: ExpedienteIfiItem): boolean {
  return e.alertaAmpliacion || !!textoCaducidad(e.diasParaCaducidad)?.urgente;
}

/** Cuántos expedientes hay en cada paso, en el orden del procedimiento (para los chips "Por paso"). */
export function resumenPorPaso(items: ExpedienteIfiItem[]): { etiqueta: string; pasoNumero: number; cantidad: number }[] {
  const porEtiqueta = new Map<string, { etiqueta: string; pasoNumero: number; cantidad: number }>();
  items.forEach((e) => {
    const { pasoActualLabel, pasoNumero } = calcularPaso(e);
    const actual = porEtiqueta.get(pasoActualLabel);
    if (actual) actual.cantidad += 1;
    else porEtiqueta.set(pasoActualLabel, { etiqueta: pasoActualLabel, pasoNumero, cantidad: 1 });
  });
  return [...porEtiqueta.values()].sort((a, b) => a.pasoNumero - b.pasoNumero);
}
