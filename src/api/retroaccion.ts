import { apiClient } from './client';

// ============================================================================
// Nulidad de GOP → retroacción del expediente (flujograma general, 11C)
// ============================================================================

export type EtapaRetroaccion = 'NOTIFICACION_CARGO' | 'IFI' | 'RESOLUCION';

export const LABEL_ETAPA_RETROACCION: Record<EtapaRetroaccion, string> = {
  RESOLUCION: 'Resolución final (se rehace la resolución)',
  IFI: 'IFI (se rehace el IFI y luego la resolución)',
  NOTIFICACION_CARGO: 'Notificación de la NC (se renotifica, luego IFI y resolución)',
};

export interface RetroaccionItem {
  id: string;
  expedienteId: string;
  etapa: EtapaRetroaccion;
  motivoNulidad: string;
  fechaDecisionGop: string;
  nota: string | null;
  ncRenotificadaEn: string | null;
  registradoPorNombre: string | null;
  createdAt: string;
  resumenAnulado: string[];
}

export const RetroaccionApi = {
  porExpediente: (expedienteId: string) => apiClient<RetroaccionItem[]>(`/retroacciones/expediente/${expedienteId}`),
  retrotraer: (apelacionId: string, etapa: EtapaRetroaccion, nota?: string) =>
    apiClient<{ id: string }>(`/retroacciones/apelacion/${apelacionId}`, { method: 'POST', body: JSON.stringify({ etapa, nota }) }),
  renotificarNc: (id: string, fecha: string) =>
    apiClient<{ ok: true }>(`/retroacciones/${id}/renotificacion-nc`, { method: 'PATCH', body: JSON.stringify({ fecha }) }),
};
