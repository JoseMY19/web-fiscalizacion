import { useEffect, useState } from 'react';
import {
  EstadoSolicitudLevantamiento,
  MedidaLevantamientoItem,
  SiguientePasoLevantamiento,
  SolicitudLevantamientoItem,
  TipoCartaLevantamiento,
} from '../../api';
import { formatearFecha } from '../../lib/fechas';

const MS_HORA = 3_600_000;
// Perú no tiene horario de verano: UTC-5 fijo (America/Lima).
const OFFSET_LIMA_MS = 5 * MS_HORA;

export const ETIQUETA_TIPO_MEDIDA: Record<string, string> = {
  CLAUSURA: 'Clausura',
  PARALIZACION: 'Paralización',
  RETENCION: 'Retención',
  DECOMISO: 'Decomiso',
  CANCELACION_EVENTO: 'Cancelación de evento',
  RETIRO_ANIMAL: 'Retiro de animal',
  OTROS: 'Otros',
};

export const tipoMedidaTexto = (tipo: string): string => ETIQUETA_TIPO_MEDIDA[tipo] ?? tipo;

export const ETIQUETA_ESTADO: Record<EstadoSolicitudLevantamiento, string> = {
  EN_EVALUACION: 'En evaluación',
  LEVANTADA: 'Levantada (favorable)',
  DENEGADA: 'Denegada — medida vigente',
  LEVANTADA_POR_VENCIMIENTO: 'Levantada por vencimiento del plazo',
};

export const VARIANTE_ESTADO: Record<EstadoSolicitudLevantamiento, 'info' | 'success' | 'danger' | 'warning'> = {
  EN_EVALUACION: 'info',
  LEVANTADA: 'success',
  DENEGADA: 'danger',
  LEVANTADA_POR_VENCIMIENTO: 'warning',
};

export const ETIQUETA_CARTA: Record<TipoCartaLevantamiento, string> = {
  LEVANTAMIENTO: 'Carta de levantamiento',
  DENEGATORIA: 'Carta denegatoria',
  LEVANTAMIENTO_VENCIMIENTO: 'Carta de levantamiento por vencimiento del plazo',
};

export const ETIQUETA_PASO: Record<SiguientePasoLevantamiento, string> = {
  EVALUAR: 'Falta evaluar',
  GENERAR_CARTA_VENCIMIENTO: 'Falta generar la carta por vencimiento',
  ENVIAR_A_FIRMA: 'Carta lista: falta enviar a firma',
  REGISTRAR_FIRMA: 'En firma del Subgerente',
  NOTIFICAR: 'Firmada: falta notificar',
  COMPLETO: 'Notificada',
};

/** Reloj de la pantalla: re-renderiza cada `intervaloMs` para el cronómetro en vivo. */
export function useAhora(intervaloMs = 1000): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), intervaloMs);
    return () => clearInterval(t);
  }, [intervaloMs]);
  return ahora;
}

export type NivelPlazo = 'normal' | 'ambar' | 'rojo' | 'vencido';

/** Mismo umbral que el backend: rojo con < 24 h (clausura) o < 5 días (otras). */
export function cuentaRegresiva(venceEnIso: string, esClausura: boolean, ahora: number): { texto: string; nivel: NivelPlazo } {
  const restanteMs = new Date(venceEnIso).getTime() - ahora;
  if (restanteMs <= 0) return { texto: 'Plazo vencido', nivel: 'vencido' };
  const horas = restanteMs / MS_HORA;
  const urgente = esClausura ? horas < 24 : horas < 5 * 24;
  if (esClausura || horas < 48) {
    const h = Math.floor(horas);
    const m = Math.floor((restanteMs % MS_HORA) / 60_000);
    const s = Math.floor((restanteMs % 60_000) / 1000);
    return {
      texto: `${String(h).padStart(2, '0')} h ${String(m).padStart(2, '0')} min ${String(s).padStart(2, '0')} s`,
      nivel: urgente ? 'rojo' : 'ambar',
    };
  }
  const dias = Math.floor(horas / 24);
  const h = Math.floor(horas - dias * 24);
  return { texto: `${dias} día${dias === 1 ? '' : 's'} ${h} h`, nivel: urgente ? 'rojo' : 'normal' };
}

export const CLASE_NIVEL: Record<NivelPlazo, string> = {
  normal: 'text-text-secondary',
  ambar: 'text-[#b45309] font-bold',
  rojo: 'text-[#be123c] font-bold',
  vencido: 'text-[#be123c] font-bold',
};

/** 'AAAA-MM-DDTHH:mm' de un <input type="datetime-local"> (hora de Lima) → ISO con zona. */
export function isoDesdeInputLima(valor: string): string {
  return `${valor}:00-05:00`;
}

/** Ahora en hora de Lima como 'AAAA-MM-DDTHH:mm' (`max` de los datetime-local). */
export function ahoraInputLima(): string {
  return new Date(Date.now() - OFFSET_LIMA_MS).toISOString().slice(0, 16);
}

/** Vista previa del vencimiento (misma regla que el backend: 48 h corridas / fin del día 30 en Lima). */
export function previsualizarVencimiento(tipoMedida: string, presentacionIso: string): Date {
  const p = new Date(presentacionIso);
  if (tipoMedida.toUpperCase().startsWith('CLAUSURA')) return new Date(p.getTime() + 48 * MS_HORA);
  const l = new Date(p.getTime() - OFFSET_LIMA_MS);
  return new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate() + 31, 4, 59, 59, 999));
}

export function nombreArchivoCarta(s: SolicitudLevantamientoItem): string {
  const base = s.tipoCarta === 'DENEGATORIA' ? 'carta-denegatoria' : s.tipoCarta === 'LEVANTAMIENTO_VENCIMIENTO' ? 'carta-levantamiento-vencimiento' : 'carta-levantamiento';
  return `${base}-${s.medida.numeroExpediente ?? s.medida.numeroActa}.docx`;
}

/** Texto del aviso para IFI / Resolución (solo informa; nunca cambia la recomendación). */
export function textoAvisoMedida(m: MedidaLevantamientoItem): string | null {
  const tipo = tipoMedidaTexto(m.medida.tipoMedida).toUpperCase();
  if (m.estado === 'LEVANTADA') {
    const motivo =
      m.motivoLevantamiento === 'FAVORABLE'
        ? 'favorable: subsanó'
        : `por vencimiento del plazo${m.evaluacionFavorable ? '; la evaluación había sido favorable (subsanó)' : ''}`;
    return `Medida provisional de ${tipo} (Acta N° ${m.medida.numeroActa}) levantada el ${formatearFecha(m.fechaLevantamiento)} (${motivo}) — tenerlo en cuenta al recomendar/imponer la medida complementaria.`;
  }
  return null;
}
