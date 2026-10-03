import { MotivoSuspensionPrescripcion, SiguientePasoPrescripcion, SolicitudPrescripcionItem } from '../../api';

export const ETIQUETA_PASO_PRESCRIPCION: Record<SiguientePasoPrescripcion, string> = {
  AGREGAR_MULTAS: 'Agregar multas',
  DECIDIR_MULTAS: 'Decidir cada multa',
  ENVIAR_A_FIRMA: 'Enviar RSG a firma',
  REGISTRAR_FIRMA: 'Registrar firma',
  NOTIFICAR: 'Notificar RSG',
  ACTUALIZAR_ESTADO_CUENTA: 'Actualizar estado de cuenta',
  COMPLETO: 'Completo',
};

export const ETIQUETA_MOTIVO_SUSPENSION: Record<MotivoSuspensionPrescripcion, string> = {
  INICIO_COACTIVA: 'Inicio de ejecución coactiva',
  REVISION_JUDICIAL: 'Revisión judicial',
  DISPOSICION_JUDICIAL: 'Disposición judicial',
};

export const ETIQUETA_ORIGEN_FIRMEZA = {
  ACTO_FIRME: 'acto firme declarado en el sistema',
  SIN_RECURSOS: '15 días hábiles sin recurso',
  MANUAL: 'ingresada a mano',
} as const;

export const MONEDA = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

export function nombreArchivoRsgPrescripcion(s: SolicitudPrescripcionItem): string {
  return `rsg-prescripcion-${(s.numeroSgd ?? s.administradoNombre).replace(/[^\w-]+/g, '_').slice(0, 40)}.docx`;
}

export function resumenMultas(s: SolicitudPrescripcionItem): string {
  const p = s.multas.filter((m) => m.resultado === 'PRESCRITA').length;
  const n = s.multas.filter((m) => m.resultado === 'NO_PRESCRITA').length;
  const sin = s.multas.length - p - n;
  return [`${s.multas.length} multa${s.multas.length === 1 ? '' : 's'}`, p ? `${p} prescrita${p === 1 ? '' : 's'}` : '', n ? `${n} no prescrita${n === 1 ? '' : 's'}` : '', sin ? `${sin} sin decidir` : '']
    .filter(Boolean)
    .join(' · ');
}
